import { Hono } from 'hono';
import integrationsRouter from './integrations/integrations.router';
export default [integrationsRouter] as [
	string,
	Hono
][];