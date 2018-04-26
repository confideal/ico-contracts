pragma solidity 0.4.23;

import "zeppelin-solidity/contracts/ownership/Claimable.sol";
import "zeppelin-solidity/contracts/ReentrancyGuard.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

import "./CampaignInterface.sol";

contract Billing is Claimable, ReentrancyGuard {
    using SafeMath for uint256;

    event Payment(address campaign, uint256 amount, address partner, bytes32 promoCodeHash);
    event Reward(address indexed partner, bytes32 promoCodeHash, address campaign, uint256 amount);
    event Withdrawal(address beneficiary, uint256 amount);
    event RewardWithdrawal(address partner, uint256 amount);

    uint256 public prepaymentPrice = 9.95 ether;
    uint256 public postPaymentMin = 24.95 ether;
    uint256 public postPaymentRate = 0.01 ether; // rate in ether

    struct Discount {
        uint256 value;
        bool isRelative; // is value set as a rate or in ETH
        address partner;
    }

    struct Conditions {
        uint256 postPaymentMin;
        uint256 postPaymentRate;
        bytes32 promoCodeHash;

        uint256 discountValue;
        bool discountIsRelative;
        address partner;
    }

    mapping(bytes32 => Discount) public discounts; // by promo code hash
    mapping(address => Conditions) public postPaymentConditions;
    mapping(address => uint256) public partnerShares; // rate in ether
    mapping(address => uint256) public partnerRewards; // available for withdrawal

    uint256 public confidealProceeds;

    function setPrepaymentPrice(uint256 price)
    public
    onlyOwner
    {
        prepaymentPrice = price;
    }

    function setPostPaymentMin(uint256 amount)
    public
    onlyOwner
    {
        postPaymentMin = amount;
    }

    function setPostPaymentRate(uint256 rate)
    public
    onlyOwner
    {
        require(rate < 1 ether);
        postPaymentRate = rate;
    }

    function addPromoCode(bytes32 promoCodeHash, uint256 discountValue, bool discountIsRelative, address partner)
    public
    onlyOwner
    {
        if (discountIsRelative) {
            require(discountValue <= 1 ether);
        }

        discounts[promoCodeHash] = Discount(discountValue, discountIsRelative, partner);
    }

    function addPromoCodes(bytes32[] promoCodeHash, uint256[] discountValue, bool[] discountIsRelative, address[] partner)
    public
    {
        require(promoCodeHash.length == discountValue.length);
        require(promoCodeHash.length == discountIsRelative.length);
        require(promoCodeHash.length == partner.length);

        for (uint8 i = 0; i < promoCodeHash.length; i++) {
            addPromoCode(promoCodeHash[i], discountValue[i], discountIsRelative[i], partner[i]);
        }
    }

    function setPartnerShare(address partner, uint256 share)
    public
    onlyOwner
    {
        require(share <= 1 ether);
        partnerShares[partner] = share;
    }

    function calculatePrepayment(bytes32 promoCodeHash)
    public
    view
    returns (uint256)
    {
        Discount storage discount = discounts[promoCodeHash];
        return applyDiscount(prepaymentPrice, discount);
    }

    function collectPrepayment(string promoCode)
    public
    payable
    {
        bytes32 promoCodeHash = keccak256(promoCode);
        uint256 payment = calculatePrepayment(promoCodeHash);
        Discount storage discount = discounts[promoCodeHash];

        require(msg.value == payment);

        processPayment(payment, discount.partner, promoCodeHash);

        delete discounts[promoCodeHash];
    }

    function register(string promoCode)
    public
    {
        bytes32 promoCodeHash = keccak256(promoCode);
        Discount storage discount = discounts[promoCodeHash];

        require(CampaignInterface(msg.sender).fundingThreshold() >= applyDiscount(postPaymentMin, discount));

        postPaymentConditions[msg.sender] = Conditions(postPaymentMin, postPaymentRate, promoCodeHash,
            discount.value, discount.isRelative, discount.partner);

        delete discounts[promoCodeHash];
    }

    function calculatePostPayment()
    public
    view
    returns (uint256)
    {
        Conditions storage conditions = postPaymentConditions[msg.sender];

        uint256 payment = CampaignInterface(msg.sender).amountRaised().mul(conditions.postPaymentRate).div(1 ether);
        if (payment < conditions.postPaymentMin) {
            payment = conditions.postPaymentMin;
        }

        Discount memory discount = Discount(conditions.discountValue, conditions.discountIsRelative, conditions.partner);

        return applyDiscount(payment, discount);
    }

    function collectPostPayment()
    public
    payable
    {
        Conditions storage conditions = postPaymentConditions[msg.sender];

        processPayment(msg.value, conditions.partner, conditions.promoCodeHash);

        delete postPaymentConditions[msg.sender];
    }

    function withdrawProceeds()
    public
    onlyOwner
    {
        uint256 amount = confidealProceeds;
        require(amount > 0);

        confidealProceeds = 0;

        owner.call.value(amount)();
        Withdrawal(owner, amount);
    }

    function withdrawRewards()
    public
    nonReentrant
    {
        uint256 amount = partnerRewards[msg.sender];
        require(amount > 0);

        partnerRewards[msg.sender] = 0;

        msg.sender.call.value(amount)();
        RewardWithdrawal(msg.sender, amount);
    }

    function applyDiscount(uint256 amount, Discount discount)
    private
    pure
    returns (uint256)
    {
        if (discount.isRelative) {
            return amount.mul(uint256(1 ether).sub(discount.value)).div(1 ether);
        }

        return amount.sub(discount.value);
    }

    function processPayment(uint256 payment, address partner, bytes32 promoCodeHash)
    private
    {
        confidealProceeds = confidealProceeds.add(payment);
        Payment(msg.sender, payment, partner, promoCodeHash);

        uint256 partnerShare = partnerShares[partner];

        if (partnerShare > 0) {
            uint256 reward = payment.mul(partnerShare).div(1 ether);
            partnerRewards[partner] = partnerRewards[partner].add(reward);
            confidealProceeds = confidealProceeds.sub(reward);
            Reward(partner, promoCodeHash, msg.sender, reward);
        }
    }
}
