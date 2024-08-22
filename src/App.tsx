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
								<FormControl id="repayAmount" isRequired mt={2}>
									<FormLabel>Repay Amount</FormLabel>
									<Input name="repayAmount" placeholder="0.05" />
								</FormControl>
								<FormControl id="collateralRemoveAmount" mt={2}>
									<FormLabel>Collateral Remove Amount</FormLabel>
									<Input name="collateralRemoveAmount" placeholder="0.05" />
								</FormControl>
								<Button type="submit" colorScheme="blue" width="100%" mt={2}>
									Send Batch
								</Button>
							</form>
						)}

						{data !== undefined && <Text mt={2}>{data}</Text>}
						{account.status === "disconnected" && (
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
