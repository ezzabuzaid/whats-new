import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import application from './main';
import { relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { showRoutes } from 'hono/dev';
const dirRelativeToCwd = relative(
	process.cwd(),
	dirname(fileURLToPath(import.meta.url))
);

application.use(
	'/:filename{.+.png$}',
	serveStatic({ root: dirRelativeToCwd })
);

application.use(
	'/:filename{.+.swagger.json$}',
	serveStatic({
		root: dirRelativeToCwd,
		rewriteRequestPath: (path) =>
			path.split('/').pop() as string
	})
);

serve({
	fetch: application.fetch,
	port: parseInt(process.env.PORT ?? '3000', 10)
});

console.log(
	`Server running at http://localhost:${process.env.PORT ?? '3000'}`
);

if (process.env.NODE_ENV === 'development') {
	showRoutes(application, {
		verbose: true
	});
}