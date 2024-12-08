import { CONFIG } from 'api.config';
import { AppUrl } from 'utils/url-helper';

export function WelcomeGroupMessage(group: string | number, handles: string[]): string {
	const chain = CONFIG.chain;
	return `
*Welcome to the ${process.env.npm_package_name} Bot*

If you receive this message, it means the bot recognized this chat. (${group})

*Available subscription handles:*
${handles.join('\n')}

*Environment*
Api Version: ${process.env.npm_package_version}
Chain/Network: ${chain.name} (${chain.id})
Time: ${new Date().toString().split(' ').slice(0, 5).join(' ')}

[Goto App](${AppUrl('')})
`;
}
