import React from "react";

import {
	EachBid,
	EachBidNameText,
	EachBidImage,
	EachBidAvatarNameContainer,
} from "../NFTDetailsStyled";

import { Link } from "react-router-dom";

interface EachBidProps {
	item: {
		bidder: string;
		bid_amount: string | number;
	};
}
const EachBidComponent: React.FC<EachBidProps> = ({ item }) => {
	return (
		<EachBid>
			<EachBidAvatarNameContainer>
				<EachBidImage src={`https://robohash.org/${item.bidder}.png`} />
				<EachBidNameText>
					<Link
						to={`https://etherscan.io/address/${item.bidder}`}
						target="_blank"
						style={{ textDecoration: "none", color: "black" }}
					>
						{item.bidder.slice(0, 6) + "..." + item.bidder.slice(-6)}
					</Link>
				</EachBidNameText>
			</EachBidAvatarNameContainer>
			<EachBidNameText>{item.bid_amount} ETH</EachBidNameText>
		</EachBid>
	);
};

export default EachBidComponent;
