pragma solidity 0.4.23;

contract CampaignInterface {
    function amountRaised() public view returns (uint256);
    function fundingThreshold() public view returns (uint256);
}
