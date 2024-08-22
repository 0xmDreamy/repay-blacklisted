import { useEffect } from "react";
import { useConnect } from "wagmi";

const autoConnctedConnectorIds = ["safe"];

function useAutoConnect() {
	const { connect, connectors } = useConnect();

	useEffect(() => {
		for (const connectorId of autoConnctedConnectorIds) {
			const connectorInstance = connectors.find((c) => c.id === connectorId);

			if (connectorInstance) {
				connect({ connector: connectorInstance });
			}
		}
	}, [connect, connectors]);
}

export { useAutoConnect };
