import {
	EmitterWebhookEvent,
	EmitterWebhookEventName,
	Webhooks,
	createNodeMiddleware
} from '@octokit/webhooks';
import {
	IncomingMessage,
	ServerResponse
} from 'node:http';
const webhooks = new Webhooks({
	secret:
		'04062d0a92fed0522c47a23e8441300d533a3b1fc1139e0960128abb91728371',
	log: console
});

export function isEventOfType<
	T extends EmitterWebhookEventName
>(
	event: EmitterWebhookEvent,
	...types: T[]
): event is EmitterWebhookEvent<T> {
	const eventName =
		'action' in event.payload
			? `${event.name}.${event.payload.action}`
			: event.name;
	return types.includes(eventName as T);
}

export function onGithubEvent<
	EventName extends EmitterWebhookEventName
>(
	event: EventName,
	...middlewares: ((
		event: EmitterWebhookEvent<EventName>
	) => boolean | void | Promise<boolean | void>)[]
) {
	webhooks.on(event, async (event) => {
		for (const middleware of middlewares) {
			let canContinue = await middleware(event);
			if (canContinue === false) {
				break;
			}
		}
	});
}

export async function receiveGithubEvents(
	request: IncomingMessage,
	response: ServerResponse<IncomingMessage>,
	path: string
) {
	let body = '';
	let statusCode = 200;
	let headers = {};

	const orignalEnd = response.end;
	const originalWriteHead = response.writeHead;

	response.end = function (...args: any[]) {
		body = args[0];
		return this;
	};

	response.writeHead = function (...args: any[]) {
		statusCode = args[0];
		headers = args[1];
		return this;
	};

	Object.defineProperty(response, 'statusCode', {
		set: function (value) {
			statusCode = value;
		}
	});

	const handler = createNodeMiddleware(webhooks, {
		path,
		log: console
	});

	const processed = await handler(request, response);

	response.end = orignalEnd;
	response.writeHead = originalWriteHead;

	return {
		processed,
		body,
		statusCode,
		headers
	};
}