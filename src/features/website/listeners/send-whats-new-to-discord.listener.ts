import * as updates from '../updates';
import { validateOrThrow } from '../../../core/validation';
import { EmitterWebhookEvent } from '@octokit/webhooks';

export async function sendWhatsNewToDiscord({
	payload,
	name
}: EmitterWebhookEvent<'pull_request.closed'>) {
	console.log(
		`${name}.${payload.action}`,
		'has been triggered'
	);

	const filesUrl = `${payload.pull_request._links.self.href}/files`;
	const input = {
		filesUrl: filesUrl,
		body: payload.pull_request.body,
		avatar_url:
			payload.pull_request.head.user.avatar_url
	};

	validateOrThrow(
		updates.sendWhatsNewToDiscordSchema,
		input
	);
	await updates.sendWhatsNewToDiscord(input);
}