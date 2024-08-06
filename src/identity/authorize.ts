import {
	ProblemDetails,
	ProblemDetailsException
} from 'rfc-7807-problem-details';

export function authorize<T>(
	...routePolicies: ((
		context: T
	) => Promise<boolean> | boolean)[]
) {
	return async (context: T, next: any) => {
		for (const policy of routePolicies) {
			if (!(await policy(context))) {
				throw new ProblemDetailsException(
					new ProblemDetails(
						'forbidden',
						'no sufficient permissions',
						403
					)
				);
			}
		}
		await next();
	};
}