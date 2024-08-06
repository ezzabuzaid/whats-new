import './features/crons';
import './features/listeners';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import dataSource from './core/data-source';
import { ValidationFailedException } from './core/validation';
import routes from './features/routes';
import {
	IdentitySubject,
	loadSubject
} from './identity';
import { ProblemDetailsException } from 'rfc-7807-problem-details';
import { StatusCode } from 'hono/utils/http-status';
const application = new Hono<{
	Variables: { subject: IdentitySubject | null };
}>();
application.use(cors(), logger());

application.use(async (context, next) => {
	const subject = await loadSubject(
		context.req.header('Authorization')
	);
	context.set('subject', subject);
	await next();
});

// TODO: use rfc-7807-problem-details
application.onError((err, context) => {
	console.error(err);

	if (err instanceof ValidationFailedException) {
		context.status(400);
		return context.json(err);
	}

	if (err instanceof ProblemDetailsException) {
		context.status(
			(err.Details.status as StatusCode) ?? 500
		);
		return context.json(err.Details);
	}

	context.status(500);
	return context.json({
		type: 'about:blank',
		title: 'Internal Server Error',
		status: 500,
		detail: 'An unexpected error occurred'
	});
});

routes.forEach((route) => {
	application.route(...route);
});

dataSource
	.initialize()
	.then(() => {
		console.log('Database initialized');
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});

application.get('/', (context, next) => {
	return context.json({
		status: 'UP'
	});
});

application.get('/health', async (context, next) => {
	await dataSource.query('SELECT 1');
	return context.json({
		status: 'UP'
	});
});

export default application;