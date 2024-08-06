import UAParser, { IResult } from 'ua-parser-js';

export interface ClientInfo {
	ip?: string | null;
	userAgent?: string | null;
	userAgentData: IResult;
}
export type IdentitySubject = {
	info: ClientInfo;
};

export async function verifyToken(
	token: string
): Promise<boolean> {
	return true;
}

export async function loadSubject(
	token: string | null | undefined
): Promise<IdentitySubject | null> {
	return null;
}