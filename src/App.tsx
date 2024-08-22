import {
	type Address,
	encodeAbiParameters,
	encodeFunctionData,
	type Hex,
	parseEther,
} from "viem";
import {
	AbsoluteCenter,
	Box,
	Button,
	ChakraProvider,
	Container,
	FormControl,
	FormLabel,
	Input,
	Text,
	VStack,
} from "@chakra-ui/react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useSendCalls } from "wagmi/experimental";
import { degenBoxContract } from "./degenBox";
import { mimContract } from "./mim";
import { cauldronContract } from "./cauldron";
import { collateralContract } from "./collateral";
import { useState } from "react";

function App() {
	const account = useAccount();
	const { connectors, connect } = useConnect();
	const { disconnect } = useDisconnect();
	const { sendCalls, data } = useSendCalls();
	const [repayAmount, setRepayAmount] = useState("");
	const [collateralRemoveAmount, setCollateralRemoveAmount] = useState("");

	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const repayActions: number[] = [];
		const repayValues: bigint[] = [];
		const repayDatas: Hex[] = [];
		const repayCalls: {
			to: Address;
			data: Hex;
		}[] = [];
		if (repayAmount !== "") {
			const amount = parseEther(repayAmount);
			if (amount > 0n) {
				repayActions.push(7, 2);
				repayValues.push(0n, 0n);
				repayDatas.push(
					encodeAbiParameters([{ type: "int256" }], [amount]),
					encodeAbiParameters(
						[{ type: "int256" }, { type: "address" }, { type: "bool" }],
						[-1n, account.address as Address, true],
					),
				);

				repayCalls.push({
					to: mimContract.address,
					data: encodeFunctionData({
						abi: mimContract.abi,
						functionName: "transfer",
						args: [degenBoxContract.address, amount],
					}),
				});
				repayCalls.push({
					to: "0xd96f48665a1410C0cd669A88898ecA36B9Fc2cce",
					data: encodeFunctionData({
						abi: degenBoxContract.abi,
						functionName: "deposit",
						args: [
							mimContract.address,
							degenBoxContract.address,
							degenBoxContract.address,
							amount,
							0n,
						],
					}),
				});
			}
		}

		const collateralRemoveActions: number[] = [];
		const collateralRemoveValues: bigint[] = [];
		const collateralRemoveDatas: Hex[] = [];
		const collateralRemoveCalls: {
			to: Address;
			data: Hex;
		}[] = [];
		if (collateralRemoveAmount !== "") {
			const amount = parseEther(collateralRemoveAmount);
			if (amount > 0n) {
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
		}

		sendCalls({
			calls: [
				...repayCalls,
				{
					to: cauldronContract.address,
					data: encodeFunctionData({
						abi: cauldronContract.abi,
						functionName: "cook",
						args: [
							[...repayActions, ...collateralRemoveActions],
							[...repayValues, ...collateralRemoveValues],
							[...repayDatas, ...collateralRemoveDatas],
						],
					}),
				},
				...collateralRemoveCalls,
			],
		});
	}

	return (
		<ChakraProvider>
			<Box width="100vw" height="100vh" bg="gray.50" p={4}>
				<AbsoluteCenter>
					<Container
						borderRadius="lg"
						bg="gray.100"
						p={6}
						minW="480px"
						minH="320px"
						borderColor="blue.100"
						borderWidth="2px"
						display="flex"
						flexDirection="column"
						justifyContent="space-between"
					>
						<Box p={2}>
							<Text fontSize="2xl" align="center" mb={2}>
								Repay Safe yvcrvSTETH
							</Text>

							<VStack spacing={4} align="center">
								<Text>Status: {account.status}</Text>
								{account.address !== undefined && (
									<Text>Address: {account.address}</Text>
								)}
							</VStack>
							{account.status === "connected" && (
								<Button
									colorScheme="red"
									width="100%"
									onClick={() => disconnect()}
									mt={2}
								>
									Disconnect
								</Button>
							)}
						</Box>
						{account.status === "connected" && (
							<form onSubmit={submit}>
								<FormControl id="repayAmount" mt={2}>
									<FormLabel>Repay Amount</FormLabel>
									<Input
										name="repayAmount"
										placeholder="0.05"
										onChange={(e) => setRepayAmount(e.target.value)}
									/>
								</FormControl>
								<FormControl id="collateralRemoveAmount" mt={2}>
									<FormLabel>Collateral Remove Amount</FormLabel>
									<Input
										name="collateralRemoveAmount"
										placeholder="0.05"
										onChange={(e) => setCollateralRemoveAmount(e.target.value)}
									/>
								</FormControl>
								<Button
									type="submit"
									colorScheme="blue"
									width="100%"
									mt={2}
									isDisabled={
										repayAmount === "" && collateralRemoveAmount === ""
									}
								>
									Send Batch
								</Button>
							</form>
						)}

						{data !== undefined && <Text mt={2}>{data}</Text>}
						{(account.status === "disconnected" ||
							account.status === "connecting") && (
							<>
								{connectors
									.filter(({ name }) => name === "WalletConnect")
									.map((connector) => (
										<Button
											colorScheme="green"
											width="100%"
											key={connector.uid}
											onClick={() => connect({ connector })}
											mt={2}
											isDisabled={account.status === "connecting"}
											isLoading={account.status === "connecting"}
										>
											{connector.name}
										</Button>
									))}
							</>
						)}
					</Container>
				</AbsoluteCenter>
			</Box>
		</ChakraProvider>
	);
}

export default App;
