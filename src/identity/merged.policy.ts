import { EmitterWebhookEvent } from '@octokit/webhooks';
import { isEventOfType } from '../core/github-webhooks';

export async function merged(
	event: EmitterWebhookEvent
) {
	if (isEventOfType(event, 'pull_request.closed')) {
		return event.payload.pull_request.merge;
	}
	return false;
}