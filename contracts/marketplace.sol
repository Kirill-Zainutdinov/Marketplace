// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

interface IERC165 {

    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721Metadata {

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

interface IERC721 {

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool _approved) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);  
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

contract Marketplace{

    // structure with information about the token offered for sale
    struct Item{
        uint256 tokenId;
        uint256 price;
        address tokenAddress;
        address tokenOwner;
    }

    // structure with information about the token put up for auction
    struct AuctionItem{
        uint256 tokenId;
        uint256 currentPrice;
        uint256 time;
        uint24 bidCount;
        address tokenAddress;
        address tokenOwner;
        address lastCustomer;
    }

    // the total number of all tokens ever put up for sale and the id of the last lot
    uint256 public listId;
    // the total number of all tokens ever put up for sale and the id of the last lot
    uint256 public listAuctionId;

    // tokens for sale
    // (lot id => structure with information)
    mapping(uint256 => Item) public list;
    // tokens up for auction
    // (lot id => structure with information)
    mapping(uint256 => AuctionItem) public listAuction;
 
    event ListItem(uint256 id, address tokenAddress, uint256 tokenId, uint256 price);
    event BuyItem(uint256 id);
    event Cancel(uint256 id);
    event ListItemOnAuction(uint256 id, address tokenAddress, uint256 tokenId, uint256 minPrice);
    event MakeBid(uint256 id, uint256 price);
    event FinishAuction(uint256 id, uint price);

    modifier isSale(uint256 id){
        require(address(0) != list[id].tokenOwner,
                "Marketplace: no such token for sale"
        );
        _;
    }

    modifier isAuction(uint256 id){
        require(address(0) != listAuction[id].tokenOwner,
                "Marketplace: no such token for auction"
        );
        _;
    }

    // put the token for sale
    function listItem(address tokenAddress, uint256 tokenId, uint256 price) external returns(uint256) {
        require(_isERC721(tokenAddress), "Marketplace: tokenAddress does not support the ERC721 interfaces");
        
        address tokenOwner = _checkAndTransferToken(tokenAddress, tokenId);

        // add to item list
        listId++;
        list[listId] = Item(tokenId, price, tokenAddress, tokenOwner);

        emit ListItem(listId, tokenAddress, price, tokenId);

        return listId;
    }

    // Buy the token
    function buyItem(uint256 id) external payable isSale(id){
        Item memory item = list[id];
        require(msg.value >= item.price, "Marketplace: not enough ETH");
 
        // remove token from sale
        delete list[id];

        // send  ETH to token woner
        payable(item.tokenOwner).transfer(item.price);
        // send token ERC721 to buyer
        IERC721(item.tokenAddress).transferFrom(address(this), msg.sender,item.tokenId);
 
        // send extra ETH back to the buyer
        if(msg.value > item.price){
            payable(msg.sender).transfer(msg.value - item.price);
        }
 
        emit BuyItem(id);
    }
 
    // remove token from sale
    function cancel(uint256 id) external isSale(id) {
        Item memory item = list[id];
        require(msg.sender == item.tokenOwner ||
                IERC721(item.tokenAddress).isApprovedForAll(item.tokenOwner, msg.sender),
                "Marketplace: caller is not are owner or operator of token"
        );
        
        // send token back to the seller 
        IERC721(item.tokenAddress).transferFrom(address(this), item.tokenOwner, item.tokenId);

        // remove token from sale
        delete list[id];

        emit Cancel(id);
    }
 
    // put the token for auction
    function listItemOnAuction(address tokenAddress, uint256 tokenId, uint256 minPrice)
        external
        returns(uint256)
    {
        require(_isERC721(tokenAddress), "Marketplace: tokenAddress does not support the ERC721 interfaces");
        
        address tokenOwner = _checkAndTransferToken(tokenAddress, tokenId);

        // add to auction list
        listAuctionId++;
        listAuction[listAuctionId] = AuctionItem(
            tokenId, 
            minPrice,
            block.timestamp,
            0,
            tokenAddress,
            tokenOwner,
            address(0)
        );

        emit ListItemOnAuction(listAuctionId, tokenAddress, tokenId, minPrice);

        return listAuctionId;
    }

    // bid at the auction
    function makeBid(uint256 id) external payable isAuction(id) returns(bool) {
        AuctionItem memory auctionItem = listAuction[id];
        require(block.timestamp < auctionItem.time + 3 days,
                "Marketplace: auction is over");
        uint256 bid = msg.value;
        require(bid > auctionItem.currentPrice,
                "Marketplace: the current price is higher than the bid");

        // return the last bid to the owner
        if(auctionItem.bidCount > 0){
            payable(auctionItem.lastCustomer).transfer(auctionItem.currentPrice);
        }

        // save new bid
        listAuction[id].lastCustomer = msg.sender;
        listAuction[id].currentPrice = bid;
        listAuction[id].bidCount++;

        emit MakeBid(id, bid);

        return true;
    }

    // finish the auction
    function finishAuction(uint256 id) external isAuction(id) {
        AuctionItem memory auctionItem = listAuction[id];
        require(block.timestamp > auctionItem.time + 3 days,
                "Marketplace: auction is not yet over");
        
        IERC721 token721 = IERC721(auctionItem.tokenAddress);

        // remove token from sale
        delete listAuction[id];

        // if even one bid has been made
        if(auctionItem.bidCount > 0){
            // send ETH to seller
            payable(auctionItem.tokenOwner).transfer(auctionItem.currentPrice);
            // send ERC721 token to buyer
            token721.transferFrom(
                address(this),
                auctionItem.lastCustomer,
                auctionItem.tokenId
            );
        } 
        // if no bids have been made
        else {
            // return ERC721 token to the seller
            token721.transferFrom(
                address(this),
                auctionItem.tokenOwner,
                auctionItem.tokenId
            );
        }

        emit FinishAuction(id, auctionItem.currentPrice);
    }

    // check that tokenAddress support ERC721 interfaces
    function _isERC721(
        address tokenAddress
    ) internal view returns (bool) {
        if (tokenAddress.code.length > 0) {
            try IERC165(tokenAddress).supportsInterface(type(IERC721).interfaceId) returns (bool response) {
                if(response){
                    try IERC165(tokenAddress).supportsInterface(type(IERC721Metadata).interfaceId) returns (bool _response){
                        return _response;
                    } catch {}
                }
            } catch {
                return false;
            }
        }
        return false;
    }

    function _checkAndTransferToken(address tokenAddress, uint256 tokenId) internal returns(address){

        IERC721 token721 = IERC721(tokenAddress);

        // check that seller - owner or operator of token
        address tokenOwner = token721.ownerOf(tokenId);
        require (msg.sender == tokenOwner || 
                msg.sender == token721.getApproved(tokenId) ||
                token721.isApprovedForAll(tokenOwner, msg.sender),
                "Marketplace: caller is not are owner or operator of token"
        );

        // check that seller approve token for marketplace
        require(address(this) == token721.getApproved(tokenId) ||
                token721.isApprovedForAll(tokenOwner,  address(this)),
                "Marketplace: no allowance to transfer a token"
        );

        // send token to marketplace
        token721.transferFrom(tokenOwner, address(this), tokenId);

        return tokenOwner;
    }
}