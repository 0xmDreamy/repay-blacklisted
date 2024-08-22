import {
	Address,
	encodeAbiParameters,
	encodeFunctionData,
	Hex,
	parseEther,
} from "viem";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useSendCalls } from "wagmi/experimental";
import { degenBoxContract } from "./degenBox";
import { mimContract } from "./mim";
import { cauldronContract } from "./cauldron";
import { collateralContract } from "./collateral";

function App() {
	const account = useAccount();
	const { connectors, connect } = useConnect();
	const { disconnect } = useDisconnect();
	const { sendCalls, data } = useSendCalls();

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formData = new FormData(e.target as HTMLFormElement);
		const repayAmount = parseEther(formData.get("repayAmount") as string);
		const collateralRemoveAmount = formData.get("collateralRemoveAmount") as
			| string
			| null;
		const collateralRemoveActions: number[] = [];
		const collateralRemoveValues: bigint[] = [];
		const collateralRemoveDatas: Hex[] = [];
		const collateralRemoveCalls: {
			to: Address;
			data: Hex;
		}[] = [];
		if (collateralRemoveAmount) {
			const amount = parseEther(collateralRemoveAmount);
			collateralRemoveActions.push(4);
			collateralRemoveValues.push(0n);
			collateralRemoveDatas.push(
				encodeAbiParameters(
					[{ type: "int256" }, { type: "address" }],
					[amount, account.address as Address],
				),
			);
			collateralRemoveCalls.push({
				to: degenBoxContract.address,
				data: encodeFunctionData({
					abi: degenBoxContract.abi,
					functionName: "withdraw",
					args: [
						collateralContract.address,
						account.address as Address,
						account.address as Address,
						0n,
						amount,
					],
				}),
			});
		}

		sendCalls({
			calls: [
				{
					to: mimContract.address,
					data: encodeFunctionData({
						abi: mimContract.abi,
						functionName: "transfer",
						args: [degenBoxContract.address, repayAmount],
					}),
				},
				{
					to: "0xd96f48665a1410C0cd669A88898ecA36B9Fc2cce",
					data: encodeFunctionData({
						abi: degenBoxContract.abi,
						functionName: "deposit",
						args: [
							mimContract.address,
							degenBoxContract.address,
							degenBoxContract.address,
							repayAmount,
							0n,
						],
					}),
				},
				{
					to: cauldronContract.address,
					data: encodeFunctionData({
						abi: cauldronContract.abi,
						functionName: "cook",
						args: [
							[7, 2, ...collateralRemoveActions],
							[0n, 0n, ...collateralRemoveValues],
							[
								encodeAbiParameters([{ type: "int256" }], [repayAmount]),
								encodeAbiParameters(
									[{ type: "int256" }, { type: "address" }, { type: "bool" }],
									[-1n, account.address as Address, true],
								),
								...collateralRemoveDatas,
							],
						],
					}),
				},
				...collateralRemoveCalls,
			],
		});
	}

	return (
		<>
			<div>
				<h2>Account</h2>

				<div>
					status: {account.status}
					<br />
					address: {account.address}
				</div>
				{account.status === "disconnected" && (
					<>
						{connectors
							.filter(({ name }) => name === "WalletConnect")
							.map((connector) => (
								<button
									key={connector.uid}
									onClick={() => connect({ connector })}
									type="button"
								>
									{connector.name}
								</button>
							))}
					</>
				)}
				{account.status === "connected" && (
					<button type="button" onClick={() => disconnect()}>
						Disconnect
					</button>
				)}
			</div>
			{account.status === "connected" && (
				<form onSubmit={submit}>
					<label htmlFor="repayAmount">Repay Amount:</label>
					<br />
					<input name="repayAmount" placeholder="0.05" required />
					<br />
					<label htmlFor="collateralRemoveAmount">
						Collateral Remove Amount:
					</label>
					<br />
					<input name="collateralRemoveAmount" placeholder="0.05" />
					<br />
					<button type="submit">Send Batch</button>
				</form>
			)}

			{data !== undefined && data}
		</>
	);
}

export default App;
