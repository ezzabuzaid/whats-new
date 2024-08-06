import Ajv from 'ajv';
import addErrors from 'ajv-errors';
import addFormats from 'ajv-formats';
import { ProblemDetailsException } from 'rfc-7807-problem-details';
import validator from 'validator';
import { ErrorObject, JSONSchemaType } from 'ajv';
const ajv = new Ajv({
	allErrors: true,
	useDefaults: 'empty',
	removeAdditional: 'failing',
	coerceTypes: true
});

addErrors(ajv);
addFormats(ajv);
function isBetween(
	date: string,
	startDate: string,
	endDate: string
) {
	if (!date) {
		return false;
	}
	if (!startDate) {
		return false;
	}
	if (!endDate) {
		return false;
	}

	return (
		validator.isAfter(date, startDate) &&
		validator.isBefore(date, endDate)
	);
}
type Input<T> =
	T extends Record<infer K, any>
		? {
				[P in K]: unknown;
			}
		: never;
const validations = [
	['isBefore', validator.isBefore],
	['isAfter', validator.isAfter],
	['isBoolean', validator.isBoolean],
	['isDate', validator.isDate],
	['isNumeric', validator.isNumeric],
	['isLatLong', validator.isLatLong],
	['isMobilePhone', validator.isMobilePhone],
	['isEmpty', validator.isEmpty],
	['isDecimal', validator.isDecimal],
	['isURL', validator.isURL],
	['isEmail', validator.isEmail],
	['isBetween', isBetween]
];

validations.forEach(([key, value]) => {
	const keyword = key as string;
	ajv.addKeyword({
		keyword: keyword,
		validate: (schema: any, data: any) => {
			if (schema === undefined || schema === null) {
				return false;
			}
			const func = value as any;
			return func.apply(validator, [
				data,
				...(Array.isArray(schema) ? schema : [schema])
			]);
		}
	});
});

export function createSchema<T>(
	properties: Record<
		keyof T,
		JSONSchemaType<any> & {
			required?: boolean;
		}
	>
): JSONSchemaType<T> {
	const required: string[] = [];
	const requiredErrorMessages: Record<string, string> =
		{};

	for (const [key, value] of Object.entries(
		properties
	) as any[]) {
		if (value.required) {
			required.push(key);
		}
		if (
			'errorMessage' in value &&
			value.errorMessage?.required
		) {
			// move the required error message from the property schema to the root schema
			// as the required keyword is not part of the property schema
			requiredErrorMessages[key] =
				value.errorMessage.required;
			delete value.errorMessage.required;
		}
	}
	const extendSchema: Record<string, unknown> = {};
	if (Object.keys(requiredErrorMessages).length) {
		extendSchema['errorMessage'] = {
			required: requiredErrorMessages
		};
	}

	const clearProperties = Object.fromEntries(
		(Object.entries(properties) as any[]).map(
			([key, value]) => {
				const { required, ...rest } = value;
				return [key, rest];
			}
		)
	);

	return {
		type: 'object',
		properties: clearProperties,
		required: required,
		additionalProperties: false,
		...extendSchema
	} as JSONSchemaType<T>;
}

/**
 * Validate input against schema
 *
 * @param schema ajv augmented json-schema
 * @param input input to validate
 * @returns
 */
export function validateInput<T>(
	schema: JSONSchemaType<T>,
	input: Record<keyof T, unknown>
): asserts input is T {
	const validate = ajv.compile(schema);
	const valid = validate(input);
	if (!valid && validate.errors) {
		throw formatErrors(validate.errors);
	}
}

function formatErrors(
	errors: ErrorObject<
		string,
		Record<string, any>,
		unknown
	>[],
	parent?: ErrorObject<
		string,
		Record<string, any>,
		unknown
	>
): ErrorObject<string, Record<string, any>, unknown> {
	return errors.reduce(
		(acc, it) => {
			if (it.keyword === 'errorMessage') {
				return {
					...acc,
					...formatErrors(it.params['errors'], it)
				};
			}

			const property = (
				it.instancePath || it.params['missingProperty']
			)
				.replace('.', '')
				.replace('/', '');
			return {
				...acc,
				[property]: parent?.message || it.message || ''
			};
		},
		{} as ErrorObject<
			string,
			Record<string, any>,
			unknown
		>
	);
}

export class ValidationFailedException extends ProblemDetailsException {
	constructor(errors: Record<string, string>) {
		super({
			type: 'validation-failed',
			status: 400,
			title: 'Bad Request.',
			detail: 'Validation failed.'
		});
		this.Details.errors = errors;
	}
}

export function validateOrThrow<T>(
	schema: JSONSchemaType<T>,
	input: Record<keyof T, unknown>
): asserts input is T {
	try {
		validateInput(schema, input);
	} catch (errors: any) {
		throw new ValidationFailedException(errors);
	}
}