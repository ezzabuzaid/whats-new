import { createSchema } from '../../../core/validation';
export const sendWhatsNewToDiscordSchema =
	createSchema<SendWhatsNewToDiscordInput>({
		filesUrl: {
			type: 'string'
		},
		body: {
			type: 'string'
		},
		avatar_url: {
			type: 'string'
		}
	});

export interface SendWhatsNewToDiscordInput {
	filesUrl?: string;
	body?: string;
	avatar_url?: string;
}

export async function sendWhatsNewToDiscord({
	filesUrl,
	body,
	avatar_url
}: SendWhatsNewToDiscordInput) {
	const prFile = await fetch(filesUrl, {
		headers: {
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28'
		}
	}).then(
		(res) =>
			res.json() as Promise<
				{
					filename: string;
					status: 'added' | 'modified' | 'removed';
				}[]
			>
	);
	const theFile = prFile.find((it) =>
		it.filename.endsWith('.md')
	);

	await fetch(
		process.env.DISCORD_WEBHOOK_URL as string,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				username: 'NewsBot',
				content: body,
				avatarUrl: avatar_url,
				url: `https://january.sh/posts/${theFile.filename}`
			})
		}
	);
	return {};
}