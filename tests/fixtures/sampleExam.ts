/**
 * A 100-question practice exam in DECA Finance cluster format, written for
 * testing the importer. It is not official DECA or MBA Research content, and
 * the textbook sources are fictional.
 *
 * Each item lists the correct answer and three distractors; the builder
 * below shuffles question order and places the correct answer so that A–D
 * are used 25 times each.
 */
import { LETTERS, type Letter } from '../../src/lib/types.ts';

export interface SampleQuestion {
  number: number;
  stem: string;
  options: string[];
  answer: Letter;
  explanation: string;
  source: string;
  piCode: string;
  piTitle: string;
}

interface Item {
  stem: string;
  correct: string;
  wrong: [string, string, string];
  explanation: string;
  code: string;
  /** Performance indicator text printed after the code; long ones wrap like real keys. */
  pi?: string;
  source: string;
}

const finance = (pages: string) =>
  `Rivera, M., & Chen, L. (2024). Principles of finance (3rd ed.) [pp. ${pages}]. Toronto, ON: Northlake Press.`;
const law = (pages: string) =>
  `Okafor, D. (2023). Business law essentials for Canadian students [pp. ${pages}]. Ottawa, ON: Maple Leaf Learning.`;
const econ = (page: string) => `Practice Press. (2025). Economics for business (2nd ed.) [p. ${page}]. Hamilton, ON: Practice Press.`;
const skills = (pages: string) =>
  `Lindqvist, A. (2022). Workplace skills: Communication, teamwork, and professional growth [pp. ${pages}]. Kingston, ON: Harbourline Books.`;
const ops = (pages: string) =>
  `Tran, K., & Moreau, J. (2024). Managing business operations [pp. ${pages}]. Waterloo, ON: Northlake Press.`;

const ITEMS: Item[] = [
  // ------------------------------------------------------ Financial Analysis
  {
    stem: 'A business has current assets of $150,000 and current liabilities of $60,000. What is its current ratio?',
    correct: '2.5',
    wrong: ['0.4', '$90,000', '1.5'],
    explanation:
      "Current ratio. The current ratio measures a business's ability to pay its short-term debts. It is calculated by dividing current assets by current liabilities: $150,000 ÷ $60,000 = 2.5.",
    code: 'FI:093',
    pi: 'Calculate financial ratios (e.g., current ratio, quick ratio, debt-to-equity ratio, working capital, etc.)',
    source: finance('212-214'),
  },
  {
    stem: "Which financial statement reports a business's revenues and expenses over a specific period of time?",
    correct: 'Income statement',
    wrong: ['Balance sheet', 'Statement of cash flows', "Statement of owner's equity"],
    explanation:
      "Income statement. The income statement shows the revenues earned and the expenses incurred during a period, and the resulting net income or net loss. A balance sheet shows a business's financial position at one point in time.",
    code: 'FI:094',
    pi: 'Explain the purpose and importance of the income statement',
    source: finance('188-190'),
  },
  {
    stem: 'Money owed to a business by customers who bought on credit is recorded as',
    correct: 'accounts receivable',
    wrong: ['accounts payable', 'retained earnings', 'unearned revenue'],
    explanation:
      'Accounts receivable. Accounts receivable are amounts customers owe the business for goods or services sold on credit. They are current assets because the business expects to collect them within a year. Accounts payable are amounts the business owes to others.',
    code: 'FI:073',
    source: finance('141-142'),
  },
  {
    stem: "If a business has total assets of $80,000 and total liabilities of $30,000, its owner's equity is",
    correct: '$50,000',
    wrong: ['$110,000', '$30,000', '$80,000'],
    explanation:
      "Accounting equation. The accounting equation states that assets equal liabilities plus owner's equity. Rearranged, owner's equity equals assets minus liabilities: $80,000 - $30,000 = $50,000.",
    code: 'FI:071',
    source: finance('120-122'),
  },
  {
    stem: 'Allocating the cost of a long-term tangible asset, such as a delivery truck, over its useful life is called',
    correct: 'depreciation',
    wrong: ['appreciation', 'accrual', 'capitalization'],
    explanation:
      "Depreciation. Depreciation spreads the cost of a long-term tangible asset over the years the asset is used to earn revenue. Appreciation is an increase in an asset's value.",
    code: 'FI:085',
    pi: 'Explain the nature of depreciation',
    source: finance('160-161'),
  },
  {
    stem: 'A machine costs $12,000, has a salvage value of $2,000, and has a useful life of five years. Using the straight-line method, what is its annual depreciation expense?',
    correct: '$2,000',
    wrong: ['$2,400', '$1,600', '$10,000'],
    explanation:
      'Straight-line depreciation. Straight-line depreciation equals the cost minus the salvage value, divided by the useful life: ($12,000 - $2,000) ÷ 5 = $2,000 per year.',
    code: 'FI:086',
    source: finance('162-164'),
  },
  {
    stem: 'A store has net sales of $500,000 and cost of goods sold of $300,000. What is its gross profit?',
    correct: '$200,000',
    wrong: ['$800,000', '$300,000', '$60,000'],
    explanation:
      'Gross profit. Gross profit is net sales minus the cost of goods sold: $500,000 - $300,000 = $200,000. Operating expenses are then subtracted from gross profit to find net income.',
    code: 'FI:091',
    source: finance('191-192'),
  },
  {
    stem: 'How much simple interest will be earned on $2,000 invested at 5% per year for three years?',
    correct: '$300',
    wrong: ['$100', '$315.25', '$3,000'],
    explanation:
      'Simple interest. Simple interest is calculated as principal × rate × time: $2,000 × 0.05 × 3 = $300. Compound interest would earn slightly more because interest would also be earned on interest.',
    code: 'FI:062',
    pi: 'Explain the time value of money',
    source: finance('58-60'),
  },
  {
    stem: 'Earning interest on both the original principal and the interest already earned is known as',
    correct: 'compounding',
    wrong: ['discounting', 'amortization', 'simple interest'],
    explanation:
      'Compounding. With compound interest, earned interest is added to the principal, so future interest is calculated on a larger balance. Over long periods, compounding greatly increases the growth of savings and investments.',
    code: 'FI:063',
    source: finance('61-63'),
  },
  {
    stem: 'The ease with which an asset can be converted into cash without a significant loss of value is its',
    correct: 'liquidity',
    wrong: ['solvency', 'leverage', 'profitability'],
    explanation:
      'Liquidity. Liquidity describes how quickly and easily an asset can be turned into cash. Cash is the most liquid asset; real estate and equipment are much less liquid.',
    code: 'FI:058',
    source: finance('44-45'),
  },
  {
    stem: "A company's debt-to-equity ratio is primarily a measure of its",
    correct: 'financial leverage',
    wrong: ['liquidity', 'inventory turnover', 'gross margin'],
    explanation:
      "Debt-to-equity ratio. The debt-to-equity ratio compares total liabilities to owner's equity. A high ratio means the business relies heavily on borrowed money, which increases financial leverage and risk.",
    code: 'FI:095',
    source: finance('216-217'),
  },
  {
    stem: "An investor who buys a corporate bond becomes the corporation's",
    correct: 'creditor',
    wrong: ['owner', 'partner', 'shareholder'],
    explanation:
      'Bonds. A bond is a loan from the investor to the issuer. The bondholder is a creditor who is entitled to interest payments and the return of principal, but does not own part of the company.',
    code: 'FI:077',
    source: finance('240-242'),
  },
  {
    stem: "A portion of a corporation's earnings that is paid out to its shareholders is called a",
    correct: 'dividend',
    wrong: ['coupon', 'premium', 'royalty'],
    explanation:
      "Dividends. A dividend is a distribution of a corporation's profits to its shareholders, usually paid in cash. A coupon is the interest payment on a bond.",
    code: 'FI:078',
    source: finance('236-237'),
  },
  {
    stem: 'Spreading money among many different types of investments to reduce overall risk is called',
    correct: 'diversification',
    wrong: ['speculation', 'leveraging', 'arbitrage'],
    explanation:
      'Diversification. Diversification reduces risk because poor performance by one investment may be offset by better performance from others. It is often summarized as not putting all of your eggs in one basket.',
    code: 'FI:081',
    pi: 'Explain types of investments (e.g., stocks, bonds, mutual funds, real estate, commodities, etc.)',
    source: finance('262-263'),
  },
  {
    stem: 'Which concept explains why $1,000 received today is worth more than $1,000 received five years from now?',
    correct: 'Time value of money',
    wrong: ['Law of diminishing returns', 'Economies of scale', 'Sunk cost'],
    explanation:
      'Time value of money. Money received today can be invested to earn interest, so it is worth more than the same amount received in the future. Present value and future value calculations are based on this concept.',
    code: 'FI:064',
    source: finance('64-66'),
  },
  {
    stem: 'The difference between a budgeted amount and the actual amount spent is a',
    correct: 'variance',
    wrong: ['forecast', 'margin', 'dividend'],
    explanation:
      'Budget variance. A variance is the difference between planned and actual results. Managers study large variances to find out why spending or revenue did not go as planned.',
    code: 'FI:106',
    source: finance('290-291'),
  },
  {
    stem: 'In which section of the statement of cash flows would the purchase of new equipment be reported?',
    correct: 'Investing activities',
    wrong: ['Operating activities', 'Financing activities', 'Non-cash activities'],
    explanation:
      "Statement of cash flows. Investing activities include buying and selling long-term assets such as equipment, buildings, and investments. Operating activities relate to day-to-day business, and financing activities involve borrowing and owners' investments.",
    code: 'FI:096',
    pi: 'Describe the nature of cash flow statements',
    source: finance('200-203'),
  },
  {
    stem: 'Receiving the proceeds of a long-term bank loan is reported in which section of the statement of cash flows?',
    correct: 'Financing activities',
    wrong: ['Investing activities', 'Operating activities', 'Equity adjustments'],
    explanation:
      "Financing activities. Cash received from borrowing, as well as loan repayments and cash from owners, are financing activities because they change the business's debt and equity.",
    code: 'FI:097',
    source: finance('203-204'),
  },
  {
    stem: 'An investor buys shares for $5,000 and later sells them for $5,600. What is the return on investment?',
    correct: '12%',
    wrong: ['8.3%', '60%', '1.2%'],
    explanation:
      'Return on investment. ROI equals the gain divided by the amount invested: ($5,600 - $5,000) ÷ $5,000 = 0.12, or 12%.',
    code: 'FI:080',
    source: finance('258-259'),
  },
  {
    stem: "A company's fixed costs are $20,000. It sells its product for $50 per unit, and the variable cost is $30 per unit. How many units must it sell to break even?",
    correct: '1,000 units',
    wrong: ['400 units', '667 units', '2,500 units'],
    explanation:
      'Break-even point. The break-even point in units is fixed costs divided by the contribution margin per unit (price minus variable cost): $20,000 ÷ ($50 - $30) = 1,000 units.',
    code: 'FI:104',
    source: finance('280-282'),
  },
  {
    stem: 'A business has revenue of $250,000 and total expenses of $190,000. What is its net income?',
    correct: '$60,000',
    wrong: ['$440,000', '$190,000', '$25,000'],
    explanation:
      'Net income. Net income is total revenue minus total expenses: $250,000 - $190,000 = $60,000. If expenses were greater than revenue, the result would be a net loss.',
    code: 'FI:092',
    source: finance('192-193'),
  },
  {
    stem: "Which factor generally has the greatest effect on a person's credit score?",
    correct: 'Payment history',
    wrong: ['Annual income', 'Level of education', 'Savings account balance'],
    explanation:
      'Credit scores. Paying bills on time is the most important factor in most credit scoring models. Income and savings are not part of a credit report, although lenders may consider them separately.',
    code: 'FI:035',
    source: finance('30-32'),
  },
  {
    stem: "If inflation is 4% per year and a savings account pays 1.5% interest, the saver's approximate real rate of return is",
    correct: '-2.5%',
    wrong: ['5.5%', '2.5%', '1.5%'],
    explanation:
      "Real rate of return. The real rate of return is approximately the nominal interest rate minus the inflation rate: 1.5% - 4% = -2.5%. The saver's money is losing purchasing power.",
    code: 'FI:067',
    source: finance('70-71'),
  },
  {
    stem: 'In general, investments that offer higher potential returns also carry',
    correct: 'higher risk',
    wrong: ['lower risk', 'guaranteed returns', 'no taxes'],
    explanation:
      'Risk-return trade-off. Investors expect to be paid for taking on more risk, so investments with higher potential returns, such as stocks, are more likely to lose value than lower-return investments such as savings accounts.',
    code: 'FI:082',
    source: finance('264-265'),
  },
  {
    stem: 'Under accrual-basis accounting, revenue is recorded when it is',
    correct: 'earned',
    wrong: ['collected in cash', 'deposited in the bank', 'budgeted'],
    explanation:
      'Accrual accounting. Accrual-basis accounting records revenue when it is earned and expenses when they are incurred, regardless of when cash changes hands. Cash-basis accounting records transactions only when cash is received or paid.',
    code: 'FI:352',
    source: finance('110-111'),
  },
  {
    stem: 'Requiring one employee to receive cash payments and a different employee to record them is an example of',
    correct: 'separation of duties',
    wrong: ['job rotation', 'vertical integration', 'cross-training'],
    explanation:
      'Internal controls. Separating the duties of handling cash and recording it makes it harder for one person to steal money and hide the theft in the records. Separation of duties is a basic internal control.',
    code: 'FI:357',
    source: finance('300-302'),
  },
  {
    stem: "An independent examination of a company's financial statements by an outside accounting firm is a(n)",
    correct: 'external audit',
    wrong: ['trial balance', 'budget review', 'internal memo'],
    explanation:
      'External audit. In an external audit, independent accountants examine the financial statements and records to give an opinion on whether they are fairly presented. Investors and lenders rely on audited statements.',
    code: 'FI:358',
    source: finance('304-305'),
  },
  {
    stem: 'A list of all general ledger accounts and their balances, used to check that total debits equal total credits, is a',
    correct: 'trial balance',
    wrong: ['bank reconciliation', 'balance sheet', 'general journal'],
    explanation:
      'Trial balance. A trial balance lists every account and its balance at a point in time. If total debits do not equal total credits, an error was made in recording or posting transactions.',
    code: 'FI:088',
    source: finance('132-133'),
  },
  {
    stem: 'In double-entry accounting, an increase in an asset account is recorded as a',
    correct: 'debit',
    wrong: ['credit', 'reversing entry', 'closing entry'],
    explanation:
      'Debits and credits. Asset accounts have normal debit balances, so increases are recorded as debits and decreases as credits. Liability and equity accounts increase with credits.',
    code: 'FI:087',
    source: finance('126-128'),
  },
  {
    stem: 'Which of the following is a mandatory payroll deduction for most employees?',
    correct: 'Income tax withholding',
    wrong: ['Charitable donations', 'Gym membership fees', 'Voluntary retirement savings contributions'],
    explanation:
      "Payroll deductions. Employers are required by law to withhold income tax from employees' pay and send it to the government. Charitable donations and voluntary savings plans are optional deductions that employees choose.",
    code: 'FI:356',
    source: finance('150-151'),
  },
  {
    stem: 'A business has current assets of $90,000 and current liabilities of $35,000. What is its working capital?',
    correct: '$55,000',
    wrong: ['$125,000', '2.57', '$35,000'],
    explanation:
      'Working capital. Working capital is current assets minus current liabilities: $90,000 - $35,000 = $55,000. It shows how much a business has available to run day-to-day operations.',
    code: 'FI:098',
    source: finance('214-215'),
  },
  {
    stem: 'Under the first-in, first-out (FIFO) inventory method, the cost of goods sold is based on the cost of',
    correct: 'the oldest items purchased',
    wrong: ['the most recent items purchased', 'the average of all purchases', 'the current retail price'],
    explanation:
      'FIFO. First-in, first-out assumes the first items bought are the first ones sold, so the cost of goods sold reflects the oldest costs and ending inventory reflects the most recent costs.',
    code: 'FI:354',
    source: finance('146-148'),
  },
  {
    stem: 'The main purpose of a bank reconciliation is to',
    correct: "explain differences between the business's cash records and the bank statement",
    wrong: ['apply for a business loan', "calculate the business's income tax", 'transfer money between accounts'],
    explanation:
      "Bank reconciliation. A bank reconciliation compares the cash balance in the business's records with the balance on the bank statement and explains the differences, such as outstanding cheques, deposits in transit, and bank fees.",
    code: 'FI:090',
    source: finance('136-138'),
  },
  {
    stem: 'A company earned net income of $30,000 on net sales of $200,000. What is its net profit margin?',
    correct: '15%',
    wrong: ['6.7%', '30%', '85%'],
    explanation:
      'Net profit margin. Net profit margin is net income divided by net sales: $30,000 ÷ $200,000 = 0.15, or 15%. It shows how much of each sales dollar the business keeps as profit.',
    code: 'FI:099',
    source: finance('218-219'),
  },
  {
    stem: 'An investment that pools money from many investors to buy a professionally managed, diversified portfolio of securities is a',
    correct: 'mutual fund',
    wrong: ['certificate of deposit', 'savings bond', 'money order'],
    explanation:
      "Mutual funds. A mutual fund combines the money of many investors and uses it to buy stocks, bonds, or other securities. Investors own shares of the fund and share in its gains, losses, and expenses.",
    code: 'FI:079',
    source: finance('250-252'),
  },
  {
    stem: 'An asset that a borrower pledges to a lender to secure a loan is called',
    correct: 'collateral',
    wrong: ['principal', 'equity', 'interest'],
    explanation:
      'Collateral. Collateral is property the lender can take if the borrower fails to repay the loan. For example, a car is the collateral for an auto loan.',
    code: 'FI:043',
    source: finance('36-37'),
  },
  // ------------------------------------------------------------ Business Law
  {
    stem: 'Which of the following is required for a contract to be legally enforceable?',
    correct: 'Consideration',
    wrong: ["A notary's stamp", "A lawyer's approval", 'A written document in every case'],
    explanation:
      'Contract elements. An enforceable contract requires an offer, acceptance, consideration (something of value exchanged), competent parties, and a legal purpose. Many contracts are enforceable even if they are oral.',
    code: 'BL:069',
    pi: 'Describe legal issues affecting businesses',
    source: law('88-90'),
  },
  {
    stem: "The owner of a sole proprietorship can lose personal assets to pay the business's debts because the owner has",
    correct: 'unlimited liability',
    wrong: ['limited liability', 'corporate immunity', 'a fiduciary duty'],
    explanation:
      'Unlimited liability. In a sole proprietorship, the business and the owner are legally the same, so the owner is personally responsible for all business debts. Corporations offer their owners limited liability.',
    code: 'BL:003',
    source: law('20-21'),
  },
  {
    stem: 'A form of business ownership that is a legal entity separate from its owners is a',
    correct: 'corporation',
    wrong: ['sole proprietorship', 'general partnership', 'licensing agreement'],
    explanation:
      'Corporations. A corporation is a separate legal entity that can own property, sign contracts, and be sued in its own name. Its owners, the shareholders, are generally not personally responsible for its debts.',
    code: 'BL:004',
    source: law('24-26'),
  },
  {
    stem: "A word, name, or symbol that legally identifies a company's products and distinguishes them from competitors' products is a",
    correct: 'trademark',
    wrong: ['patent', 'copyright', 'trade secret'],
    explanation:
      'Trademarks. A trademark protects brand names, logos, and slogans. Patents protect inventions, and copyrights protect original creative works such as books and music.',
    code: 'BL:051',
    source: law('140-141'),
  },
  {
    stem: "A financial advisor who is legally required to act in the client's best interest has a(n)",
    correct: 'fiduciary duty',
    wrong: ['warranty obligation', 'easement', 'lien'],
    explanation:
      "Fiduciary duty. A fiduciary must put the client's interests ahead of their own, avoid conflicts of interest, and act with care and loyalty when managing the client's money.",
    code: 'BL:067',
    source: law('76-77'),
  },
  {
    stem: "Buying or selling a company's shares based on important information that has not been released to the public is",
    correct: 'insider trading',
    wrong: ['short selling', 'arbitrage', 'day trading'],
    explanation:
      'Insider trading. Trading on material, non-public information is illegal because it gives the trader an unfair advantage over other investors. Securities regulators investigate and penalize insider trading.',
    code: 'BL:132',
    source: law('210-212'),
  },
  {
    stem: 'In most cases, a contract signed by a minor is',
    correct: 'voidable by the minor',
    wrong: ['void from the start', 'always enforceable', 'a criminal offence'],
    explanation:
      'Contracts with minors. Because minors are not considered fully competent to contract, they can usually cancel most contracts. The adult party, however, remains bound unless the minor chooses to cancel.',
    code: 'BL:070',
    source: law('94-95'),
  },
  {
    stem: 'Failing to perform the duties agreed to in a legally binding agreement is a',
    correct: 'breach of contract',
    wrong: ['tort', 'misdemeanour', 'lien'],
    explanation:
      'Breach of contract. A breach occurs when one party does not do what the contract requires. The other party may be entitled to remedies such as damages or specific performance.',
    code: 'BL:071',
    source: law('98-100'),
  },
  // --------------------------------------------------------------- Economics
  {
    stem: 'The basic economic problem that exists because resources are limited while wants are unlimited is',
    correct: 'scarcity',
    wrong: ['inflation', 'surplus', 'productivity'],
    explanation:
      "Scarcity. Because there are not enough resources to satisfy everyone's wants, individuals, businesses, and governments must make choices about how to use them.",
    code: 'EC:001',
    pi: 'Explain the concept of economic resources',
    source: econ('4'),
  },
  {
    stem: 'The value of the next best alternative that is given up when a choice is made is the',
    correct: 'opportunity cost',
    wrong: ['sunk cost', 'marginal revenue', 'fixed cost'],
    explanation:
      'Opportunity cost. Every choice has a cost: the benefit you would have received from the best option you did not choose. For example, the opportunity cost of studying tonight may be the wages you could have earned working.',
    code: 'EC:013',
    source: econ('9'),
  },
  {
    stem: 'According to the law of demand, when the price of a product rises, the quantity demanded generally',
    correct: 'decreases',
    wrong: ['increases', 'stays the same', 'doubles'],
    explanation:
      'Law of demand. Price and quantity demanded move in opposite directions. As prices rise, consumers buy less; as prices fall, they buy more, assuming other factors stay the same.',
    code: 'EC:005',
    source: econ('38'),
  },
  {
    stem: 'A general increase in the prices of goods and services over time is',
    correct: 'inflation',
    wrong: ['deflation', 'recession', 'depreciation'],
    explanation:
      'Inflation. Inflation reduces purchasing power, because each dollar buys fewer goods and services than it did before. Deflation is a general decrease in prices.',
    code: 'EC:083',
    source: econ('112'),
  },
  {
    stem: 'When a central bank raises its key interest rate, borrowing money generally becomes',
    correct: 'more expensive',
    wrong: ['cheaper', 'tax-free', 'unavailable'],
    explanation:
      'Monetary policy. Raising the key interest rate increases the interest rates banks charge on loans. This discourages borrowing and spending and is often used to slow inflation.',
    code: 'EC:086',
    source: econ('121'),
  },
  {
    stem: 'The total market value of all final goods and services produced within a country in one year is its',
    correct: 'gross domestic product',
    wrong: ['consumer price index', 'balance of trade', 'national debt'],
    explanation:
      'Gross domestic product. GDP is the most common measure of the size of an economy. Rising real GDP generally signals economic growth.',
    code: 'EC:017',
    source: econ('96'),
  },
  {
    stem: 'A significant decline in economic activity that lasts for several months or more is a',
    correct: 'recession',
    wrong: ['expansion', 'recovery', 'peak'],
    explanation:
      'Business cycle. The business cycle moves through expansion, peak, contraction, and trough. A recession is a period of contraction marked by falling output, income, and employment.',
    code: 'EC:018',
    source: econ('101'),
  },
  {
    stem: 'A market in which there is only one seller of a product that has no close substitutes is a',
    correct: 'monopoly',
    wrong: ['oligopoly', 'perfect competition', 'monopolistic competition'],
    explanation:
      'Monopoly. A monopoly controls the entire supply of a product, which gives it significant power over price. An oligopoly has a few large sellers.',
    code: 'EC:011',
    source: econ('64'),
  },
  {
    stem: "If the supply of a product increases while demand stays the same, the product's price will most likely",
    correct: 'fall',
    wrong: ['rise', 'stay the same', 'be set by law'],
    explanation:
      'Supply and demand. When supply increases and demand does not change, there is more of the product available than buyers want at the old price, so the market price tends to fall.',
    code: 'EC:006',
    source: econ('44'),
  },
  // ----------------------------------------------------------- Communication
  {
    stem: 'Which of the following is an example of active listening?',
    correct: "Paraphrasing the speaker's main point to confirm understanding",
    wrong: ['Planning your reply while the speaker is talking', 'Checking messages during the conversation', 'Interrupting to share a similar story'],
    explanation:
      "Active listening. Active listeners give the speaker their full attention and confirm their understanding, for example by paraphrasing or asking clarifying questions. Planning a reply or interrupting shows the listener isn't focused on the speaker.",
    code: 'CO:017',
    pi: 'Demonstrate active listening skills',
    source: skills('12-14'),
  },
  {
    stem: 'In a business letter, the main purpose of the letter should usually be stated in the',
    correct: 'first paragraph',
    wrong: ['signature block', 'closing paragraph', 'postscript'],
    explanation:
      'Business letters. Readers are busy, so an effective business letter states its purpose at the beginning. The middle paragraphs give details, and the closing paragraph states any action needed.',
    code: 'CO:133',
    source: skills('40-42'),
  },
  {
    stem: 'Which of the following is appropriate when writing a professional email?',
    correct: 'Using a clear and specific subject line',
    wrong: ['Writing the message entirely in capital letters', 'Using slang and abbreviations', 'Leaving the subject line blank'],
    explanation:
      'Email etiquette. A clear subject line tells the reader what the message is about and helps them find it later. Writing in all capital letters is read as shouting, and slang is too informal for business.',
    code: 'CO:090',
    source: skills('46-47'),
  },
  {
    stem: 'A client who crosses their arms and leans away during a meeting may be communicating',
    correct: 'defensiveness or discomfort',
    wrong: ['agreement', 'enthusiasm', 'openness'],
    explanation:
      'Nonverbal communication. Body language can reveal feelings that people do not say out loud. Crossed arms and leaning away often suggest defensiveness or discomfort, so a professional might pause and ask whether the client has concerns.',
    code: 'CO:092',
    source: skills('20-21'),
  },
  {
    stem: "Before writing a report for the company's board of directors, the writer should first identify the report's",
    correct: 'audience and purpose',
    wrong: ['font and page size', 'binding type', 'page count'],
    explanation:
      'Planning written communication. Knowing who will read the report and why determines what information to include, how much detail to provide, and what tone to use.',
    code: 'CO:088',
    source: skills('36-37'),
  },
  // -------------------------------------------------------- Customer Relations
  {
    stem: 'When a customer calls to complain about an error on their account, the employee should first',
    correct: 'listen carefully to understand the problem',
    wrong: ["explain the company's policies", 'transfer the call to a manager', 'offer a refund right away'],
    explanation:
      'Handling complaints. Listening first shows respect and helps the employee understand exactly what went wrong before deciding how to fix it. Explaining policies or offering a solution too early can make the customer feel ignored.',
    code: 'CR:009',
    source: skills('70-72'),
  },
  {
    stem: "A bank teller who tells a friend about a customer's account balance is violating",
    correct: 'customer confidentiality',
    wrong: ['zoning laws', 'copyright law', 'trade regulations'],
    explanation:
      "Confidentiality. Financial institutions must protect customers' personal and financial information. Sharing a customer's account details without permission breaks the customer's trust and privacy laws.",
    code: 'CR:006',
    source: skills('66-67'),
  },
  {
    stem: 'Which action is most likely to build long-term customer loyalty at a financial institution?',
    correct: 'Consistently providing reliable service',
    wrong: ['Adding fees without notice', 'Changing policies frequently', 'Reducing the hours that branches are open'],
    explanation:
      'Customer loyalty. Customers stay with businesses they trust. Delivering reliable, consistent service over time builds that trust, while surprise fees and frequent policy changes drive customers away.',
    code: 'CR:004',
    source: skills('62-63'),
  },
  {
    stem: 'When dealing with an angry customer, an employee should',
    correct: 'remain calm and professional',
    wrong: ['raise their voice to be heard', 'argue about who is at fault', 'ignore the customer until they calm down'],
    explanation:
      'Difficult customers. Staying calm keeps the situation from getting worse and helps the employee focus on solving the problem. Arguing or ignoring the customer usually makes them angrier.',
    code: 'CR:010',
    source: skills('74-75'),
  },
  {
    stem: "The level of service that customers expect based on a company's advertising and reputation is part of its",
    correct: 'brand promise',
    wrong: ['balance sheet', 'cost structure', 'credit policy'],
    explanation:
      'Brand promise. A brand promise is what a company commits to delivering to its customers. Employees support the brand promise when the service they give matches what customers were led to expect.',
    code: 'CR:001',
    source: skills('58-59'),
  },
  // ---------------------------------------------------- Emotional Intelligence
  {
    stem: 'Recognizing how your own emotions affect your work performance is an example of',
    correct: 'self-awareness',
    wrong: ['empathy', 'delegation', 'networking'],
    explanation:
      'Self-awareness. Self-aware people understand their emotions, strengths, and weaknesses, and how these affect others. It is the foundation of emotional intelligence.',
    code: 'EI:002',
    source: skills('90-91'),
  },
  {
    stem: 'Understanding and sharing the feelings of a coworker who is going through a difficult time is',
    correct: 'empathy',
    wrong: ['apathy', 'assertiveness', 'competition'],
    explanation:
      "Empathy. Empathy means seeing a situation from another person's point of view and understanding how they feel. Empathetic employees build stronger working relationships.",
    code: 'EI:011',
    source: skills('94-95'),
  },
  {
    stem: 'Which of the following is a healthy way to manage workplace stress?',
    correct: 'Prioritizing tasks and taking short breaks',
    wrong: ['Skipping meals to finish work faster', 'Working late every night', 'Keeping all problems to yourself'],
    explanation:
      'Stress management. Organizing work by priority and taking short breaks help employees stay focused and avoid burnout. Skipping meals and overworking usually increase stress.',
    code: 'EI:028',
    source: skills('104-106'),
  },
  {
    stem: 'An employee reports a mistake they made even though no one else noticed it. The employee is demonstrating',
    correct: 'integrity',
    wrong: ['ambition', 'flexibility', 'persuasion'],
    explanation:
      'Integrity. People with integrity are honest and follow ethical principles even when no one is watching. Reporting your own mistakes builds trust with employers and coworkers.',
    code: 'EI:023',
    source: skills('98-99'),
  },
  {
    stem: 'The most effective way to respond to constructive criticism from a supervisor is to',
    correct: 'listen and ask how you can improve',
    wrong: ['explain why the supervisor is wrong', 'complain to coworkers', 'ignore the feedback'],
    explanation:
      'Constructive criticism. Constructive criticism is meant to help you improve. Listening carefully and asking for specific suggestions shows maturity and a willingness to grow.',
    code: 'EI:003',
    source: skills('92-93'),
  },
  {
    stem: 'Two team members disagree about how to complete a project. The best first step is for them to',
    correct: 'discuss the issue directly and respectfully',
    wrong: ['complain to the rest of the team', 'stop communicating until the project ends', 'let the loudest person decide'],
    explanation:
      "Conflict resolution. Most workplace conflicts are best resolved when the people involved talk calmly, listen to each other's views, and look for a solution both can accept.",
    code: 'EI:015',
    pi: 'Use conflict-resolution skills (e.g., identify the source of the conflict, suggest solutions, reach agreement, etc.)',
    source: skills('110-112'),
  },
  {
    stem: 'Clearly and respectfully stating your own needs while also considering the needs of others is',
    correct: 'assertive communication',
    wrong: ['aggressive communication', 'passive communication', 'passive-aggressive communication'],
    explanation:
      "Assertiveness. Assertive communicators express themselves honestly and directly without attacking others. Aggressive communicators ignore others' needs, and passive communicators ignore their own.",
    code: 'EI:009',
    source: skills('100-101'),
  },
  {
    stem: 'A manager who asks team members for their ideas before making a decision is using which leadership style?',
    correct: 'Democratic',
    wrong: ['Autocratic', 'Laissez-faire', 'Bureaucratic'],
    explanation:
      'Leadership styles. Democratic, or participative, leaders involve employees in decision-making. Autocratic leaders make decisions alone, and laissez-faire leaders give employees almost complete freedom.',
    code: 'EI:062',
    source: skills('120-122'),
  },
  // --------------------------------------------------- Information Management
  {
    stem: 'Which type of software is best suited for creating a monthly budget that calculates totals automatically?',
    correct: 'Spreadsheet',
    wrong: ['Word processing', 'Presentation', 'Web browser'],
    explanation:
      'Spreadsheets. Spreadsheet software organizes numbers in rows and columns and uses formulas to calculate totals automatically, which makes it ideal for budgets and financial analysis.',
    code: 'NF:009',
    source: ops('30-31'),
  },
  {
    stem: 'Regularly copying important business files to a separate storage location protects a business against',
    correct: 'data loss',
    wrong: ['identity theft', 'price changes', 'market saturation'],
    explanation:
      'Data backup. Backups make it possible to restore files if the originals are lost because of hardware failure, accidental deletion, fire, or malware.',
    code: 'NF:005',
    source: ops('36-37'),
  },
  {
    stem: 'An email that pretends to be from a bank and asks the recipient to confirm their password is an example of',
    correct: 'phishing',
    wrong: ['encryption', 'a firewall', 'a spam filter'],
    explanation:
      'Phishing. Phishing messages impersonate trusted organizations to trick people into revealing passwords, account numbers, or other personal information. Banks do not ask customers to confirm passwords by email.',
    code: 'NF:110',
    pi: 'Explain the nature of cybersecurity risks to a business',
    source: ops('40-41'),
  },
  {
    stem: 'Information that a business collects for the first time for a specific purpose, such as through its own customer survey, is',
    correct: 'primary data',
    wrong: ['secondary data', 'metadata', 'public data'],
    explanation:
      'Primary data. Primary data are collected firsthand for the current purpose. Secondary data were collected earlier by someone else for another purpose, such as government statistics.',
    code: 'NF:015',
    source: ops('24-25'),
  },
  {
    stem: 'Converting data into a code so that it cannot be read by unauthorized people is',
    correct: 'encryption',
    wrong: ['compression', 'formatting', 'indexing'],
    explanation:
      'Encryption. Encryption scrambles data so that only someone with the correct key can read it. Financial institutions use encryption to protect customer information stored on and sent between computers.',
    code: 'NF:112',
    source: ops('42-43'),
  },
  {
    stem: 'An organized collection of related information that can be easily searched, sorted, and updated is a',
    correct: 'database',
    wrong: ['spreadsheet chart', 'word-processing template', 'slide show'],
    explanation:
      'Databases. A database stores large amounts of related information, such as customer records, in an organized way so users can quickly find, sort, and update it.',
    code: 'NF:008',
    source: ops('32-33'),
  },
  // -------------------------------------------------------------- Operations
  {
    stem: "Keeping more inventory on hand than a business needs increases the business's",
    correct: 'carrying costs',
    wrong: ['sales revenue', 'gross margin', 'customer loyalty'],
    explanation:
      'Inventory control. Carrying costs include storage, insurance, spoilage, and the money tied up in stock. Too much inventory raises these costs, while too little can lead to lost sales.',
    code: 'OP:024',
    source: ops('88-90'),
  },
  {
    stem: 'The document a buyer sends to a supplier to order goods is a',
    correct: 'purchase order',
    wrong: ['invoice', 'receipt', 'packing slip'],
    explanation:
      'Purchase orders. A purchase order lists the items, quantities, and prices the buyer wants to purchase. Once the supplier accepts it, it becomes a binding agreement.',
    code: 'OP:016',
    source: ops('76-77'),
  },
  {
    stem: 'A bill that a seller sends to a buyer listing the goods sold and the amount owed is a(n)',
    correct: 'invoice',
    wrong: ['purchase requisition', 'bill of lading', 'credit memo'],
    explanation:
      'Invoices. An invoice requests payment from the buyer and usually includes the invoice number, items sold, prices, payment terms, and due date.',
    code: 'OP:017',
    source: ops('78-79'),
  },
  {
    stem: 'An employee notices a spill on the floor of the bank lobby. What should the employee do first?',
    correct: 'Block off the area and report the spill',
    wrong: ['Finish serving the current customer', 'Post a notice on the staff bulletin board', "Wait for the cleaning staff's scheduled visit"],
    explanation:
      'Workplace safety. Hazards should be dealt with right away to prevent injuries. Blocking off the area keeps customers and coworkers safe until the spill can be cleaned up.',
    code: 'OP:007',
    source: ops('60-61'),
  },
  {
    stem: 'Checking products or services against established standards to make sure they meet requirements is',
    correct: 'quality control',
    wrong: ['market research', 'cost accounting', 'product positioning'],
    explanation:
      "Quality control. Quality control involves inspecting or testing products and services and correcting problems so that they meet the business's standards and customers' expectations.",
    code: 'OP:020',
    source: ops('100-102'),
  },
  {
    stem: 'Which of the following is an example of controlling expenses in an office?',
    correct: 'Turning off equipment when it is not in use',
    wrong: ['Ordering supplies by rush shipment', 'Printing extra copies of every document', 'Leaving the lights on overnight'],
    explanation:
      'Expense control. Small savings add up. Turning off unused equipment lowers energy costs, while rush shipping and unnecessary printing increase expenses.',
    code: 'OP:025',
    source: ops('92-93'),
  },
  // ------------------------------------------------- Professional Development
  {
    stem: 'The main purpose of a résumé is to',
    correct: 'summarize your qualifications so an employer will invite you to an interview',
    wrong: ['list every job you have ever applied for', 'state the salary you expect', 'replace the job interview'],
    explanation:
      'Résumés. A résumé gives employers a short summary of your education, experience, and skills. Its goal is to earn you an interview, not to get you the job on its own.',
    code: 'PD:026',
    source: skills('140-142'),
  },
  {
    stem: 'Which professional designation is commonly held by people who help clients create personal financial plans?',
    correct: 'Certified Financial Planner (CFP)',
    wrong: ['Project Management Professional (PMP)', 'Registered Nurse (RN)', 'Certified Information Systems Auditor (CISA)'],
    explanation:
      'Financial careers. The CFP designation shows that a financial planner has met education, examination, experience, and ethics requirements for giving financial planning advice.',
    code: 'PD:024',
    source: skills('150-151'),
  },
  {
    stem: 'A goal that is specific, measurable, attainable, relevant, and time-bound is a',
    correct: 'SMART goal',
    wrong: ['mission statement', 'stretch target', 'vision statement'],
    explanation:
      'SMART goals. Writing goals that are specific, measurable, attainable, relevant, and time-bound makes it easier to plan the steps needed to reach them and to track progress.',
    code: 'PD:018',
    source: skills('130-131'),
  },
  {
    stem: 'Taking courses after you start working to keep your professional skills and knowledge up to date is',
    correct: 'continuing education',
    wrong: ['job shadowing', 'orientation', 'probation'],
    explanation:
      'Continuing education. Many financial professionals must complete continuing education to keep their licences and designations, because laws, products, and technology change often.',
    code: 'PD:012',
    source: skills('154-155'),
  },
  {
    stem: 'Building professional relationships with people who may be able to help your career is called',
    correct: 'networking',
    wrong: ['bartering', 'outsourcing', 'benchmarking'],
    explanation:
      'Networking. Networking involves making and keeping contacts with people in your field. Many jobs are filled through referrals from professional contacts.',
    code: 'PD:037',
    source: skills('146-147'),
  },
  {
    stem: 'A client offers a financial employee an expensive gift in the hope of receiving special treatment. What is the most ethical response?',
    correct: 'Politely decline the gift and follow company policy',
    wrong: ['Accept the gift but tell no one', 'Accept the gift and give the client special treatment', 'Ask the client for a larger gift'],
    explanation:
      'Business ethics. Accepting a gift meant to influence your decisions creates a conflict of interest. Most financial institutions have policies that require employees to decline such gifts or report them.',
    code: 'PD:251',
    pi: 'Demonstrate ethical work habits',
    source: skills('160-162'),
  },
  // ---------------------------------------------------------- Risk Management
  {
    stem: 'The amount a policyholder pays regularly to an insurance company for coverage is the',
    correct: 'premium',
    wrong: ['deductible', 'claim', 'beneficiary'],
    explanation:
      'Insurance premiums. The premium is the price of insurance coverage, usually paid monthly or yearly. The deductible is the amount the insured pays before the insurer pays a claim.',
    code: 'RM:041',
    source: finance('320-321'),
  },
  {
    stem: 'The amount the insured must pay out of pocket before the insurance company pays a claim is the',
    correct: 'deductible',
    wrong: ['premium', 'policy limit', 'rider'],
    explanation:
      'Deductibles. A deductible is the portion of a loss the policyholder pays. Choosing a higher deductible usually lowers the premium because the insured takes on more of the risk.',
    code: 'RM:042',
    source: finance('322-323'),
  },
  {
    stem: 'A risk that offers only the chance of loss or no loss, such as a fire damaging a building, is a',
    correct: 'pure risk',
    wrong: ['speculative risk', 'market risk', 'opportunity risk'],
    explanation:
      'Pure risk. A pure risk has no chance of gain, only the possibility of loss or no loss, which is why it can usually be insured. A speculative risk, such as starting a business, can result in a gain or a loss.',
    code: 'RM:040',
    source: finance('314-315'),
  },
  {
    stem: 'Buying insurance is an example of which risk management strategy?',
    correct: 'Transferring risk',
    wrong: ['Avoiding risk', 'Retaining risk', 'Ignoring risk'],
    explanation:
      'Risk transfer. Buying insurance shifts the financial burden of a possible loss from the business to the insurance company in exchange for a premium.',
    code: 'RM:043',
    pi: 'Explain ways to transfer risk to others (e.g., insurance, contracts, warranties, hedging, etc.)',
    source: finance('316-317'),
  },
  // ---------------------------------------------------- Strategic Management
  {
    stem: "In a SWOT analysis, a new competitor entering the company's market would be classified as a(n)",
    correct: 'threat',
    wrong: ['strength', 'weakness', 'opportunity'],
    explanation:
      'SWOT analysis. Strengths and weaknesses are internal to the company, while opportunities and threats come from the external environment. A new competitor is an external factor that could hurt the business.',
    code: 'SM:007',
    pi: 'Conduct a SWOT analysis for use in the planning process',
    source: ops('12-14'),
  },
  {
    stem: "A brief statement that describes a company's purpose and what it does is its",
    correct: 'mission statement',
    wrong: ['balance sheet', 'organizational chart', 'job description'],
    explanation:
      'Mission statements. A mission statement explains why a business exists and guides its decisions and goals. It is usually one or two sentences long.',
    code: 'SM:004',
    source: ops('8-9'),
  },
  {
    stem: 'A measurable value that shows how effectively a company is achieving an important business objective is a',
    correct: 'key performance indicator',
    wrong: ['vision statement', 'standard operating procedure', 'fixed cost'],
    explanation:
      'Key performance indicators. KPIs, such as monthly sales growth or customer retention rate, let managers track progress toward goals and spot problems early.',
    code: 'SM:027',
    source: ops('18-19'),
  },
  // --------------------------------------------------------------- Marketing
  {
    stem: 'The specific group of customers that a business aims to reach with its products is its',
    correct: 'target market',
    wrong: ['supply chain', 'board of directors', 'sales quota'],
    explanation:
      'Target markets. Businesses identify a target market so they can design products, prices, and promotions that appeal to the customers most likely to buy.',
    code: 'MK:014',
    source: ops('120-121'),
  },
  {
    stem: 'The four Ps of the marketing mix are product, price, place, and',
    correct: 'promotion',
    wrong: ['people', 'profit', 'packaging'],
    explanation:
      'Marketing mix. The marketing mix is made up of product, price, place (distribution), and promotion. Businesses combine these four elements to meet the needs of their target market.',
    code: 'MK:002',
    source: ops('116-117'),
  },
  // ----------------------------------------------- Human Resources Management
  {
    stem: 'The process of introducing new employees to the company, its policies, and their coworkers is',
    correct: 'orientation',
    wrong: ['termination', 'recruitment', 'compensation'],
    explanation:
      'Orientation. A good orientation program helps new employees feel welcome, understand how the business works, and become productive more quickly.',
    code: 'HR:360',
    source: ops('140-141'),
  },
  {
    stem: "Posting a job opening on a company's website is part of which human resources activity?",
    correct: 'Recruitment',
    wrong: ['Performance appraisal', 'Separation', 'Arbitration'],
    explanation:
      'Recruitment. Recruitment is the process of finding and attracting qualified candidates for open positions through job postings, referrals, job fairs, and other methods.',
    code: 'HR:357',
    source: ops('134-135'),
  },
];

/** Deterministic PRNG so the sample is identical every run. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: T[], rand: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function build(): SampleQuestion[] {
  const rand = mulberry32(2026);
  const order = shuffled(ITEMS, rand);
  const positions = shuffled(
    order.map((_, i) => i % 4),
    rand,
  );
  return order.map((item, i) => {
    const pos = positions[i];
    const options: string[] = [...item.wrong];
    options.splice(pos, 0, item.correct);
    return {
      number: i + 1,
      stem: item.stem,
      options,
      answer: LETTERS[pos],
      explanation: item.explanation,
      source: item.source,
      piCode: item.code,
      piTitle: item.pi ?? '',
    };
  });
}

export const SAMPLE_QUESTIONS: SampleQuestion[] = build();

export const SAMPLE_PREAMBLE = [
  'Written Exam for State/Province Use',
  'Test Number 9123',
  'Finance Cluster Exam',
  'This sample was prepared for the 2025-2026 Competitive Events Program format.',
  'Written to test the DECA Study importer. This is practice content, not an official DECA or MBA Research exam, and the textbook sources are fictional.',
];
