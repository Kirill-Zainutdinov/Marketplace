// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

interface IERC721Metadata {

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

contract NotIERC721{
    function supportsInterface(bytes4 interfaceId) public view returns (bool) {
        return interfaceId == type(IERC721Metadata).interfaceId;
    }
}