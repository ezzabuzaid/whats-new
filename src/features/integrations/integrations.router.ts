import { Hono } from 'hono';
import { receiveGithubEvents } from '../../core/github-webhooks';
import { StatusCode } from 'hono/utils/http-status';
import {
	IncomingMessage,
	ServerResponse
} from 'node:http';
const router = new Hono();

router.post(
	'/github/webhooks',
	async (context, next) => {
		const nodeContext = context.env as {
			incoming: IncomingMessage;
			outgoing: ServerResponse<IncomingMessage>;
		};

		const { processed, body, headers, statusCode } =
			await receiveGithubEvents(
				nodeContext.incoming,
				nodeContext.outgoing,
				'/integrations/github/webhooks'
			);
		if (!processed) {
			// github middleware did not process the request due to
			// path mismatch which is unlikely to happen given we control the path
			return context.body('', 400);
		}
		return context.body(
			body,
			statusCode as StatusCode,
			headers
		);
	}
);

export default ['/integrations', router] as const;