import { camelCase } from 'lodash-es';
import {
	Brackets,
	DeepPartial,
	EntityManager,
	EntityTarget,
	ObjectLiteral,
	QueryRunner,
	SelectQueryBuilder,
	WhereExpressionBuilder
} from 'typeorm';
import dataSource from './data-source';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
export type ExecutePipeline<I extends ObjectLiteral> =
	<O extends Record<string, any>>(
		domainEntity: I,
		rawEntity: Record<string, any>
	) => I;

export async function execute<U extends ObjectLiteral>(
	qb: SelectQueryBuilder<U>,
	...mappers: ExecutePipeline<U>[]
) {
	const { entities, raw } =
		await qb.getRawAndEntities();
	return entities.map((entity, index) => {
		return mappers.reduce((acc, mapper) => {
			return mapper(acc, raw[index]);
		}, entity);
	});
}

/**
 * Begin a transaction and execute a computation. If the computation succeeds, the transaction is committed. If the computation fails, the transaction is rolled back.
 *
 * @param computation async function that takes a `EntityManager` and returns a `Promise`
 * @returns the result of the computation
 * @throws the error thrown by the computation or the error thrown by the transaction
 * @example
 *
 * // If the computation succeeds, the transaction is committed
 *
 * const result = await useTransaction(async (manager) => {
 *  const user = await manager.findOne(User, 1);
 *  user.name = 'New Name';
 *  await manager.save(user);
 *  return user;
 * });
 *
 * // result is the updated user
 *
 * // If the computation fails, the transaction is rolled back
 * const result = await useTransaction(async (manager) => {
 *  const user = await manager.findOne(User, 1);
 *  user.name = 'New Name';
 *  await manager.save(user);
 *  throw new Error('Something went wrong');
 * });
 *
 * // result is undefined
 * // If the transaction fails, the error is thrown
 * const result = await useTransaction(async (manager) => {
 *  const user = await manager.findOne(User, 1);
 *  user.name = 'New Name';
 *  await manager.save(user);
 *  await manager.query('DROP TABLE users');
 * });
 *
 */
export async function useTransaction<TResult>(
	computation: (
		manager: EntityManager
	) => Promise<TResult>
) {
	let queryRunner: QueryRunner =
		dataSource.createQueryRunner();
	await queryRunner.connect();
	await queryRunner.startTransaction();
	try {
		const result = await computation(
			queryRunner.manager
		);
		await queryRunner.commitTransaction();
		return result;
	} catch (error) {
		await queryRunner.rollbackTransaction();
		await queryRunner.release();
		(queryRunner as any) = null;
		throw error;
	}
}

export function limitOffsetPagination<
	Entity extends ObjectLiteral
>(
	qb: SelectQueryBuilder<Entity>,
	options: {
		pageNo?: number;
		pageSize: number;
		count: number;
	}
) {
	const pageSize = options.pageSize;
	const pageNo = options.pageNo ?? 1;
	const offset = (pageNo - 1) * pageSize;
	qb.take(pageSize);
	qb.skip(offset);

	return (result: Entity[]) => ({
		hasNextPage: result.length === pageSize,
		hasPreviousPage: offset > 0,
		pageSize: options.pageSize,
		currentPage: options.pageNo,
		totalCount: options.count,
		totalPages: Math.ceil(
			options.count / options.pageSize
		)
	});
}

export function deferredJoinPagination<
	Entity extends ObjectLiteral
>(
	qb: SelectQueryBuilder<Entity>,
	options: {
		pageNo?: number;
		pageSize: number;
		count: number;
	}
) {
	const pageSize = options.pageSize;
	const pageNo = options.pageNo ?? 1;
	const offset = (pageNo - 1) * pageSize;

	const { tablePath: tableName } =
		qb.expressionMap.findAliasByName(qb.alias);
	if (!tableName) {
		throw new Error(
			`Could not find table path for alias ${qb.alias}`
		);
	}

	const subQueryAlias = `deferred_join_${tableName}`;
	qb.innerJoin(
		(subQuery) => {
			const subQueryTableAlias = `deferred_${tableName}`;

			return subQuery
				.from(tableName, subQueryTableAlias)
				.select(`${subQueryTableAlias}.id`, 'id')
				.orderBy(`${subQueryTableAlias}.createdAt`)
				.limit(pageSize)
				.offset(offset);
		},
		subQueryAlias,
		`${qb.alias}.id = ${subQueryAlias}.id`
	);
	return (result: Entity[]) => ({
		hasNextPage: result.length === pageSize,
		hasPreviousPage: offset > 0,
		pageSize: options.pageSize,
		currentPage: options.pageNo,
		totalCount: options.count,
		totalPages: Math.ceil(
			options.count / options.pageSize
		)
	});
}

export function cursorPagination<
	Entity extends ObjectLiteral
>(
	qb: SelectQueryBuilder<Entity>,
	options: {
		count: number;
		pageSize: number;
		/**
		 * Base64 encoded string of the last record's cursor
		 */
		cursor?: string; // we shouldn't need to specify before or after cursor, the cursor should be enough
	}
) {
	const cursorPayload = options.cursor
		? JSON.parse(
				Buffer.from(options.cursor, 'base64').toString(
					'utf-8'
				)
			)
		: null;
	const alias = qb.alias;

	let orderByColumns = Object.keys(
		qb.expressionMap.orderBys
	);

	if (!orderByColumns.includes(`${alias}.createdAt`)) {
		// always order by createdAt to ensure a consistent order
		// createdAt will be either first order by in case no order by is specified by the caller function or last order by in case the caller function specified an order by
		qb.addOrderBy(`${alias}.createdAt`);
	}
	if (!orderByColumns.includes(`${alias}.id`)) {
		// fallback to order by id if more than one record is duplicated (have the same attributes used in order by clause)
		qb.addOrderBy(`${alias}.id`);
	}

	orderByColumns = Object.keys(
		qb.expressionMap.orderBys
	);

	if (cursorPayload) {
		qb.andWhere(
			new Brackets((qb) => {
				function withCurrentColumn(
					qb: WhereExpressionBuilder,
					index: number
				) {
					const column = orderByColumns[index];
					const paramName = camelCase(
						`last ${getColumnNameWithoutAlias(column, alias)}`
					);
					qb.andWhere(`${column} > :${paramName}`, {
						[paramName]: cursorPayload[paramName]
					});
				}

				for (
					let index = 0;
					index < orderByColumns.length;
					index++
				) {
					if (index === 0) {
						withCurrentColumn(qb, index);
						continue;
					}
					qb.orWhere(
						new Brackets((qb) => {
							for (let j = 0; j < index; j++) {
								const previousColumn =
									orderByColumns[j];
								const paramName = camelCase(
									`last ${getColumnNameWithoutAlias(previousColumn, alias)}`
								);
								qb.andWhere(
									`${previousColumn} = :${paramName}`,
									{
										[paramName]:
											cursorPayload[paramName]
									}
								);
							}
							withCurrentColumn(qb, index);
						})
					);
				}
			})
		);
	}

	qb.take(options.pageSize + 1);
	return (result: Entity[]) => ({
		nextCursor: Buffer.from(
			JSON.stringify(
				orderByColumns.reduce<Record<string, any>>(
					(acc, column) => {
						const paramName = camelCase(
							`last ${getColumnNameWithoutAlias(column, alias)}`
						);
						return {
							...acc,
							[paramName]:
								qb.expressionMap.parameters[paramName]
						};
					},
					{}
				)
			)
		).toString('base64'),
		previousCursor: null,
		startCursor: null, // always null
		endCursor: '', // think of it as startCursor but the order is reversed
		hasNextPage: false, // if there is nextCursor, then there is a next page
		hasPreviousPage: false, // if there is previousCursor, then there is a previous page
		pageSize: options.pageSize,
		totalCount: options.count
	});
}

function getColumnNameWithoutAlias(
	column: string,
	alias: string
) {
	return column.replace(`${alias}.`, '');
}

export function createQueryBuilder<
	Entity extends ObjectLiteral
>(entity: EntityTarget<Entity>, alias: string) {
	const repo = dataSource.getRepository(entity);
	return repo.createQueryBuilder(alias);
}

export async function removeEntity<
	Entity extends ObjectLiteral,
	T extends DeepPartial<Entity>
>(
	entityType: EntityTarget<Entity>,
	qb: SelectQueryBuilder<T>
) {
	const repo = dataSource.getRepository(entityType);
	const entity = await qb.getOneOrFail();
	await repo.softRemove(entity);
	return entity;
}

export async function updateEntity<
	Entity extends ObjectLiteral,
	T extends QueryDeepPartialEntity<Entity>
>(
	qb: SelectQueryBuilder<T>,
	entity: Omit<
		T,
		'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
	>
) {
	const result = await qb
		.update()
		.set(entity as unknown as Entity)
		.execute();
	return (result.affected ?? 0) > 0;
}

export async function increment<
	Entity extends ObjectLiteral,
	T extends QueryDeepPartialEntity<Entity>,
	Column extends Exclude<
		keyof Omit<
			T,
			'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
		>,
		symbol | number
	>
>(
	qb: SelectQueryBuilder<T>,
	column: Column,
	value: number | string
) {
	const setRecord: QueryDeepPartialEntity<Entity> = {
		[column]: () => `${column} + :incrementValue`
	} as Entity;
	const result = await qb
		.update()
		.set(setRecord as never)
		.setParameter('incrementValue', value)
		.execute();
	return (result.affected ?? 0) > 0;
}

export async function decrement<
	Entity extends ObjectLiteral,
	T extends QueryDeepPartialEntity<Entity>,
	Column extends Exclude<
		keyof Omit<
			T,
			'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
		>,
		symbol | number
	>
>(
	qb: SelectQueryBuilder<T>,
	column: Column,
	value: number | string
) {
	const setRecord: QueryDeepPartialEntity<Entity> = {
		[column]: () => `${column} + :decrementValue`
	} as Entity;
	const result = await qb
		.update()
		.set(setRecord as never)
		.setParameter('decrementValue', value)
		.execute();
	return (result.affected ?? 0) > 0;
}

export function saveEntity<
	Entity extends ObjectLiteral,
	T extends DeepPartial<Entity>
>(
	entityType: EntityTarget<Entity>,
	entity: Omit<
		T,
		'createdAt' | 'updatedAt' | 'deletedAt'
	>
) {
	const repo = dataSource.getRepository(entityType);
	return repo.save(entity as T);
}

export async function upsertEntity<
	Entity extends ObjectLiteral,
	T extends QueryDeepPartialEntity<Entity>
>(
	entityType: EntityTarget<Entity>,
	entity: Omit<
		T,
		'createdAt' | 'updatedAt' | 'deletedAt'
	>,
	conflictColumns: string[] = ['id']
) {
	const repo = dataSource.getRepository(entityType);
	await repo
		.createQueryBuilder()
		.insert()
		.into(entityType)
		.values(entity as T)
		.orUpdate(Object.keys(entity), conflictColumns)
		.execute();
}