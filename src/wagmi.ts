import { http, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { safe, walletConnect } from "wagmi/connectors";

export const config = createConfig({
	chains: [mainnet],
	connectors: [
		walletConnect({ projectId: import.meta.env.VITE_WC_PROJECT_ID }),
		safe(),
	],
	transports: {
		[mainnet.id]: http(),
	},
});

declare module "wagmi" {
	interface Register {
		config: typeof config;
	}
}
