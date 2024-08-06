import { onGithubEvent } from '../../core/github-webhooks';
import { merged } from '../../identity/merged.policy';
import * as listeners from './listeners';
onGithubEvent(
	'pull_request.closed',
	merged,
	listeners.sendWhatsNewToDiscord
);