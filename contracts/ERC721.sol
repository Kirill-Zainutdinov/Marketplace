// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

interface IERC165 {

    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721Receiver {

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
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

interface IERC721Metadata {

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

library String{

    function toString(uint256 value) internal pure returns(string memory) {
        uint256 temp = value;
        uint256 digits;
        do {
            digits++;
            temp /= 10;
        } while (temp != 0);
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

abstract contract ERC165 is IERC165 {

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}

contract ERC721 is IERC721, IERC721Metadata, ERC165{

    using String for uint256;

    address _owner;
    uint256 _tokenId;
    string _baseURI;
    string _name;
    string _symbol;

    mapping(uint256 => address) owners;
    mapping(address => uint256) balances;
    mapping(uint256 => address) tokenApprovals;
    mapping(address => mapping(address => bool)) operatorApprovals;

    constructor(string memory __name, string memory __symbol, string memory __baseURI) {
        _owner = msg.sender;
        _name = __name;
        _symbol = __symbol;
        _baseURI = __baseURI;
    }

    function mint(address to) external returns (uint256) {
        require(msg.sender == _owner, "ERC721: you are not owner");
        uint256 newTokenId = ++(_tokenId);
        balances[to] += 1;
        owners[newTokenId] = to;
        emit Transfer(address(0), to, newTokenId);
        return newTokenId;
    }

    function approve(address spender, uint256 tokenId) public {
        address tokenOwner = owners[tokenId];
        require(msg.sender == tokenOwner ||
                msg.sender == tokenApprovals[tokenId] ||
                operatorApprovals[tokenOwner][msg.sender],
                "ERC721: approve caller is not owner or approved operator"
        );
        tokenApprovals[tokenId] = spender;
        emit Approval(tokenOwner, spender, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) public {
        operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        _checkBeforeTransfer(msg.sender, from, to, tokenId);
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId, 
        bytes memory data
    ) public {
        _checkBeforeTransfer(msg.sender, from, to, tokenId);
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 response) {
                return response == IERC721Receiver.onERC721Received.selector;
            } catch {
                return false;
            }
        } else {
            return true;
        }
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        tokenApprovals[tokenId] = address(0);
        balances[from] -= 1;
        balances[to] += 1;
        owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function _checkBeforeTransfer(address spender, address from, address to, uint256 tokenId) internal view {
        require(tokenId <= _tokenId && tokenId != 0, "ERC721: Token with this id does not exist");
        address tokenOwner = owners[tokenId];
        require(from == tokenOwner, "ERC721: transfer from incorrect owner");
        require(to != address(0), "ERC721: transfer to the zero address");
        require(spender == tokenOwner ||
                operatorApprovals[tokenOwner][spender] ||
                tokenApprovals[tokenId] == spender,
                "ERC721: transfer caller is not owner or approved operator"
        );
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function name() public view returns (string memory){
        return _name;
    }

    function symbol() public view returns (string memory){
        return _symbol;
    }

    function getBaseUri() public view returns (string memory){
        return _baseURI;
    }
    
    function getTokenId() public view returns (uint256){
        return _tokenId;
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(tokenId <= _tokenId || _tokenId != 0, "ERC721: URI query for nonexistent token");
        return string.concat(_baseURI, tokenId.toString());
    }

    function balanceOf(address owner) external view returns (uint256) {
        return balances[owner];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return owners[tokenId];
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        return tokenApprovals[tokenId];
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return operatorApprovals[owner][operator];
    }
}