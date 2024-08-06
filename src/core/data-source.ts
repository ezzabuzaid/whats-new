import {
	DataSource,
	DefaultNamingStrategy
} from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import entites from '../features/entites';

class NamingStrategy extends DefaultNamingStrategy {
	override tableName(
		targetName: string,
		userSpecifiedName: string | undefined
	): string {
		return super.tableName(
			userSpecifiedName ?? targetName,
			undefined
		);
	}
}
const options: PostgresConnectionOptions = {
	type: 'postgres',
	useUTC: true,
	url: process.env.CONNECTION_STRING,
	migrationsRun: true,
	entities: [...entites],
	logging: false, // process.env.NODE_ENV !== 'production'
	synchronize: true, // process.env.NODE_ENV !== 'production'
	ssl: process.env.NODE_ENV === 'production',
	namingStrategy: new NamingStrategy()
};
export default new DataSource(options);