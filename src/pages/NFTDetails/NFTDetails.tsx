import React, { useMemo } from "react";
import {
	NFTDetailsContainer,
	MainNFTImage,
	MainNFTAndButtonsContainer,
	ButtonsContainer,
	ActionButton,
	SmartContractWalletAddress,
	LinkContent,
	NftsOfMainNftContainer,
	NftsHeadText,
	LastBidsContainer,
	MainNFTHeadText,
	InfoMessageText,
	CountdownInfoText,
	OpenseaLogoMiddle,
	NftsDescriptionText,
} from "./NFTDetailsStyled";
import Countdown from "react-countdown";
import NFTS from "./NFTDetailsComponents/NFTS";
import { useAccount, useBalance } from "wagmi";
import { TokenboundClient } from "@tokenbound/sdk";
import EachBidComponent from "./NFTDetailsComponents/EachBidComponent";

import { useCallback, useEffect, useState, useContext } from "react";
import { useEthers6Signer } from "../../hooks";
import { Link } from "react-router-dom";
import { ExternalLinkIcon } from "../../components/ExternalLinkIcon";
import useMoralis from "../../hooks/useMoralis";
import usePost from "../../hooks/usePost";
import useFetch from "../../hooks/useFetch";
import AdminStatusContext from "../../contexts/AdminStatusContext";
import { useManageAuctions } from "../../hooks/useAuction";
import AuctionReservedPrice from "../../LayoutComponents/AuctionReservedPrice";
import opensea from "../../assets/opensea-logo.png";

const NFTDetails = () => {
	const parsedNftData = JSON.parse(localStorage.getItem("nftData")!);
	const [nftsToDisplay, setnftsToDisplay] = useState<any>();
	const [createdAccount, setcreatedAccount] = useState<string>();
	const { isConnected, address } = useAccount();
	const { isAdmin } = useContext(AdminStatusContext) as { isAdmin: boolean };
	const [bidValue, setbidValue] = useState("");

	const nftData = parsedNftData;
	const [tbAccounts, setTbAccounts] = useState<`0x${string}`[]>([]);
	const [isInAuction, setisInAuction] = useState(true);
	const [hasWallet, sethasWallet] = useState("");

	const auctionData: any = useFetch({
		path: "/auctions",
	});
	const wallets: any = useFetch({ path: "/wallets" });
	const lastBids: any = useFetch({ path: `/bids/${parsedNftData.auction_id}` });

	const nftsInWallet = useMoralis(hasWallet);
	const {
		data: balance,
		isError,
		isLoading,
	}: any = useBalance({
		address: address,
		chainId: 1,

		watch: false,
	});

	useEffect(() => {
		window.scrollTo(0, 0);
	}, []);

	useEffect(() => {
		const filteredNfts = () => {
			if (nftsInWallet) {
				const nfts = nftsInWallet.map((nft: any) => {
					if (nft?.owner_of.toLowerCase() === hasWallet.toLowerCase()) {
						return nft;
					}
				});
				return nfts;
			}
		};

		setnftsToDisplay(filteredNfts());
	}, [hasWallet, nftsInWallet.length]);
	useEffect(() => {
		{
			wallets &&
				wallets?.forEach((wallet: any) => {
					if (
						wallet.token_id === parsedNftData.token_id &&
						wallet.contract_address === parsedNftData.token_address
					) {
						sethasWallet(wallet.wallet_address);
					}
				});
		}
	}, [wallets]);
	useEffect(() => {
		{
			auctionData &&
				auctionData?.forEach((auction: any) => {
					if (
						auction.token_id === parsedNftData.token_id &&
						auction.contract_address === parsedNftData.token_address
					) {
						setisInAuction(true);
					}
				});
		}
	}, [auctionData]);

	const signer: any = useEthers6Signer({ chainId: 1 });
	const tokenboundClient = new TokenboundClient({ signer, chainId: 1 });

	const { postReq } = usePost();

	const lastBidsData = useMemo(() => lastBids?.slice(), [lastBids]);

	const bidBalanceCondition = useMemo(
		() =>
			balance?.formatted < auctionData?.[parsedNftData.auction_id]?.highest_bid &&
			balance?.formatted < auctionData?.[parsedNftData.auction_id]?.highest_bid * 1.1,
		[balance, auctionData]
	);

	const openseaRenderCondition = useMemo(
		() => parsedNftData && parsedNftData?.contract_address !== "",
		[parsedNftData]
	);

	const auctionWalletCondition = useMemo(
		() => !localStorage.getItem(`${nftData.token_address}/${nftData.token_id}`)?.includes("0x"),
		[nftData]
	);

	const cannotBidTextMessageRenderCondition = useMemo(
		() => parseFloat(balance?.formatted) < parseFloat(bidValue),
		[balance, bidValue]
	);

	const mainNFTImageSource: string = JSON.parse(parsedNftData.metadata).image;
	const mainNFTName: string = JSON.parse(parsedNftData.metadata).name;
	const mainNFTDescription: string = JSON.parse(parsedNftData.metadata).description;

	const { placeBid, endAuction, contract } = useManageAuctions({
		auction_id: parsedNftData?.auction_id,
	});

	const renderer = ({ hours, minutes, seconds, completed }: any) => {
		if (!completed) {
			return (
				<NftsHeadText>
					{hours} : {minutes < 10 ? `0${minutes}` : minutes} : {seconds < 10 ? `0${seconds}` : seconds}
				</NftsHeadText>
			);
		}
	};

	const createAccount = useCallback(async () => {
		if (!tokenboundClient || !address) return;
		const createdAccount = await tokenboundClient.createAccount({
			tokenContract: parsedNftData.token_address,
			tokenId: parsedNftData.token_id,
		});
		tbAccounts.push(createdAccount);

		setcreatedAccount(createdAccount);
		const metadataPostData = {
			contract_address: parsedNftData.token_address,
			token_id: parsedNftData.token_id,
			description: JSON.parse(parsedNftData.metadata).name,
			image_url: JSON.parse(parsedNftData.metadata).image,
		};
		const newWalletPostData = {
			contract_address: parsedNftData.token_address,
			token_id: parsedNftData.token_id,
			wallet_address: createdAccount,
		};

		await postReq({
			path: "/metadata/new",
			data: metadataPostData,
		});
		await postReq({
			path: "/wallets/new",
			data: newWalletPostData,
		});
	}, [tokenboundClient]);

	const reservePrice =
		Array.isArray(auctionData) &&
		auctionData.length > 0 &&
		auctionData?.find((auction: any) => auction.auction_id === parsedNftData.auction_id)
			?.reserve_price;

	const highestBid =
		Array.isArray(auctionData) &&
		auctionData.length > 0 &&
		auctionData?.find((auction: any) => auction.auction_id === parsedNftData.auction_id)?.highest_bid;

	const ONE_DAY_IN_SECONDS = 86400;
	const [remainingTime, setremainingTime] = useState<any>(ONE_DAY_IN_SECONDS + 1);
	async function getRemainingTime(id: any) {
		try {
			await contract
				.getRemainingTime(id)
				.then((res: any) => {
					console.log(res);
					if (res !== undefined) {
						const x = Number(res);
						console.log(x);
						setremainingTime(x);
						console.log(remainingTime);
					} else {
						setremainingTime(res);
					}
				})
				.catch((err: any) => {
					return;
				});
		} catch (error) {
			console.error("Error getting remaining time:", error);
		}
	}
	useEffect(() => {
		getRemainingTime(parsedNftData?.auction_id);
	}, []);
	getRemainingTime(parsedNftData?.auction_id);

	const [open, setOpen] = useState<boolean>(false);
	const handleOpen = () => setOpen(true);
	const handleClose = () => setOpen(false);

	const aid: any = useFetch({
		path: `/auctions/${parsedNftData?.token_address}/${parsedNftData?.token_id}`,
	});

	const balanceFormatted = parseFloat(balance?.formatted).toFixed(2);

	return (
		<NFTDetailsContainer>
			<MainNFTAndButtonsContainer>
				{openseaRenderCondition && (
					<Link
						to={`https://opensea.io/assets/ethereum/${parsedNftData?.token_address}/${parsedNftData?.token_id}`}
						target="_blank"
						style={{ textDecoration: "none", color: "black" }}
					>
						{<OpenseaLogoMiddle src={opensea} />}
					</Link>
				)}
				<MainNFTImage src={mainNFTImageSource} />
				<MainNFTHeadText>{mainNFTName}</MainNFTHeadText>
				<div>
					{hasWallet !== "" && (
						<SmartContractWalletAddress>
							<Link
								to={`https://sepolia.etherscan.io/address/${hasWallet}`}
								target="_blank"
								style={{ textDecoration: "none", color: "black" }}
							>
								<LinkContent>
									Wallet address: <br></br>
									<br></br>
									{hasWallet}
									<ExternalLinkIcon />
								</LinkContent>
							</Link>
						</SmartContractWalletAddress>
					)}
				</div>
				<ButtonsContainer>
					{auctionWalletCondition ? (
						<>
							{isAdmin ? (
								<>
									<div style={{ paddingTop: "10px" }}>
										{hasWallet === "" && (
											<ActionButton onClick={() => createAccount()}>create wallet</ActionButton>
										)}

										{<ActionButton onClick={() => handleOpen()}>new auction</ActionButton>}

										{isInAuction && (
											<>
												<ActionButton
													onClick={async () => {
														endAuction(aid[0]?.auction_id);
													}}
												>
													end auction
												</ActionButton>
											</>
										)}
									</div>
								</>
							) : (
								<>
									{remainingTime !== 0 && (
										<div
											style={{
												width: "100%",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
											}}
										>
											<input
												value={bidValue}
												onChange={(e) => {
													setbidValue(e.target.value);
												}}
												style={{
													paddingLeft: "20px",
													height: "50px",
													width: "70%",
												}}
												placeholder={
													lastBids && lastBids.length > 0
														? `Bid more than ${((lastBids?.[0].bid_amount * 11) / 10).toFixed(6)} ETH`
														: `Bid more than ${reservePrice} ETHs`
												}
											/>

											<ActionButton
												disabled={
													bidValue.includes(",") ||
													parseFloat(bidValue) < reservePrice ||
													balance?.formatted < reservePrice ||
													balance?.formatted < highestBid * 1.1 ||
													parseFloat(balance?.formatted) < parseFloat(bidValue) ||
													parseFloat(bidValue) < highestBid * 1.1
												}
												onClick={() => placeBid(parsedNftData.auction_id, bidValue)}
											>
												bid
											</ActionButton>
										</div>
									)}

									{remainingTime === 0 && <CountdownInfoText>The auction has ended.</CountdownInfoText>}

									{!address ? (
										<CountdownInfoText>Connect your wallet to display auction status</CountdownInfoText>
									) : (
										<>
											{remainingTime === undefined || remainingTime > ONE_DAY_IN_SECONDS ? (
												<CountdownInfoText>The reserve price has not been met yet.</CountdownInfoText>
											) : (
												<CountdownInfoText>
													<Countdown date={Date.now() + remainingTime * 1000} renderer={renderer} />
												</CountdownInfoText>
											)}
										</>
									)}
								</>
							)}
						</>
					) : (
						<SmartContractWalletAddress>
							<Link
								to={"https://etherscan.io/address/" + { createdAccount }}
								target="_blank"
								style={{ textDecoration: "none" }}
							>
								<LinkContent>
									{createdAccount}
									<ExternalLinkIcon />
								</LinkContent>
							</Link>
						</SmartContractWalletAddress>
					)}
				</ButtonsContainer>

				{bidBalanceCondition && (
					<InfoMessageText>Your balance is not sufficient to place a bid </InfoMessageText>
				)}

				{parseFloat(balance?.formatted) < parseFloat(bidValue) ||
					(parseFloat(bidValue) < auctionData?.[parsedNftData.auction_id]?.highest_bid * 1.1 && (
						<InfoMessageText>
							Your bid must be more than{" "}
							{(auctionData?.[parsedNftData.auction_id]?.highest_bid * 1.1).toFixed(3)} ETH
						</InfoMessageText>
					))}

				{cannotBidTextMessageRenderCondition && (
					<InfoMessageText>
						Your balance {balanceFormatted} cannot bid {parseFloat(bidValue)} ETH on this NFT.
					</InfoMessageText>
				)}

				<LastBidsContainer>
					{lastBidsData.map((item: any, idx: number) => {
						return <EachBidComponent key={idx} item={item} />;
					})}
				</LastBidsContainer>
			</MainNFTAndButtonsContainer>

			<NftsOfMainNftContainer>
				<NftsDescriptionText>{mainNFTDescription}</NftsDescriptionText>

				<NFTS nftsData={nftsToDisplay} />
			</NftsOfMainNftContainer>
			<AuctionReservedPrice open={open} handleClose={handleClose} handleOpen={handleOpen} />
		</NFTDetailsContainer>
	);
};

export default NFTDetails;
