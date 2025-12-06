export interface Tip {
  id: number;
  text: string;
  category: "Savings" | "Investing" | "Budgeting" | "Mindset" | "Debt";
  author?: string;
}

const tips: Tip[] = [
  {
    id: 1,
    text: "Do not save what is left after spending, but spend what is left after saving.",
    category: "Savings",
    author: "Warren Buffett",
  },
  {
    id: 2,
    text: "The 50/30/20 Rule: Allocate 50% of income to needs, 30% to wants, and 20% to savings and debt repayment.",
    category: "Budgeting",
  },
  {
    id: 3,
    text: "Compound interest is the eighth wonder of the world. He who understands it, earns it... he who doesn't... pays it.",
    category: "Investing",
    author: "Albert Einstein",
  },
  {
    id: 4,
    text: "A budget is telling your money where to go instead of wondering where it went.",
    category: "Budgeting",
    author: "Dave Ramsey",
  },
  {
    id: 5,
    text: "The best time to plant a tree was 20 years ago. The second best time is now. Start investing today.",
    category: "Investing",
  },
  {
    id: 6,
    text: "Beware of little expenses. A small leak will sink a great ship.",
    category: "Savings",
    author: "Benjamin Franklin",
  },
  {
    id: 7,
    text: "Rule No. 1: Never lose money. Rule No. 2: Never forget Rule No. 1.",
    category: "Investing",
    author: "Warren Buffett",
  },
  {
    id: 8,
    text: "It's not how much money you make, but how much money you keep, how hard it works for you, and how many generations you keep it for.",
    category: "Mindset",
    author: "Robert Kiyosaki",
  },
  {
    id: 9,
    text: "Live below your means. It’s the only way to gain financial freedom.",
    category: "Savings",
  },
  {
    id: 10,
    text: "Pay yourself first. Automatically transfer a portion of your paycheck to savings before you pay any bills.",
    category: "Savings",
  },
  {
    id: 11,
    text: "Time in the market beats timing the market.",
    category: "Investing",
  },
  {
    id: 12,
    text: "Don't put all your eggs in one basket. Diversification is key to managing risk.",
    category: "Investing",
  },
  {
    id: 13,
    text: "Financial peace isn't the acquisition of stuff. It's learning to live on less than you make, so you can give money back and have money to invest.",
    category: "Mindset",
    author: "Dave Ramsey",
  },
  {
    id: 14,
    text: "Emergency Fund: Aim to save 3-6 months of living expenses to cover unexpected costs without going into debt.",
    category: "Savings",
  },
  {
    id: 15,
    text: "Avoid high-interest debt like the plague. Pay off credit cards in full every month.",
    category: "Debt",
  },
  {
    id: 16,
    text: "Inflation is the silent killer of purchasing power. Investing is your shield against it.",
    category: "Investing",
  },
  {
    id: 17,
    text: "Price is what you pay. Value is what you get.",
    category: "Mindset",
    author: "Warren Buffett",
  },
  {
    id: 18,
    text: "The stock market is a device for transferring money from the impatient to the patient.",
    category: "Investing",
    author: "Warren Buffett",
  },
  {
    id: 19,
    text: "Track your net worth. It gives you a big-picture view of your financial health.",
    category: "Mindset",
  },
  {
    id: 20,
    text: "Lifestyle inflation: As your income grows, try to keep your spending the same and save the difference.",
    category: "Savings",
  },
  {
    id: 21,
    text: "Understand the difference between an asset (puts money in your pocket) and a liability (takes money out).",
    category: "Mindset",
  },
  {
    id: 22,
    text: "Automate your finances. Automation makes good habits easy and bad habits hard.",
    category: "Budgeting",
  },
  {
    id: 23,
    text: "Invest in yourself. Your ability to earn income is your greatest asset.",
    category: "Mindset",
  },
  {
    id: 24,
    text: "Don't buy things you don't need with money you don't have to impress people you don't like.",
    category: "Mindset",
    author: "Dave Ramsey",
  },
  {
    id: 25,
    text: "The 24-Hour Rule: Wait 24 hours before making a significant non-essential purchase to avoid impulse buying.",
    category: "Savings",
  },
  {
    id: 26,
    text: "Review your subscriptions regularly. Cancel what you don't use.",
    category: "Budgeting",
  },
  {
    id: 27,
    text: "Start small. Even a small SIP can grow into a large corpus over time due to compounding.",
    category: "Investing",
  },
  {
    id: 28,
    text: "Insurance is for protection, not investment. Keep them separate.",
    category: "Mindset",
  },
  {
    id: 29,
    text: "Term insurance is the most cost-effective way to secure your family's financial future.",
    category: "Mindset",
  },
  {
    id: 30,
    text: "Health insurance is a must. One medical emergency can wipe out years of savings.",
    category: "Mindset",
  },
  {
    id: 31,
    text: "Know your credit score and check your credit report regularly for errors.",
    category: "Debt",
  },
  {
    id: 32,
    text: "If you can't buy it twice, you can't afford it.",
    category: "Mindset",
    author: "Jay-Z",
  },
  {
    id: 33,
    text: "Money is a terrible master but an excellent servant.",
    category: "Mindset",
    author: "P.T. Barnum",
  },
  {
    id: 34,
    text: "Rich people stay rich by living like they're broke. Broke people stay broke by living like they're rich.",
    category: "Mindset",
  },
  {
    id: 35,
    text: "The goal isn't more money. The goal is living life on your terms.",
    category: "Mindset",
  },
  {
    id: 36,
    text: "Opportunity cost: Every rupee you spend on one thing is a rupee you can't spend on something else.",
    category: "Budgeting",
  },
  {
    id: 37,
    text: "Index funds are a great low-cost way to get broad market exposure.",
    category: "Investing",
  },
  {
    id: 38,
    text: "Don't let market volatility scare you out of your long-term plan.",
    category: "Investing",
  },
  {
    id: 39,
    text: "Your savings rate is more important than your investment returns.",
    category: "Savings",
  },
  {
    id: 40,
    text: "Negotiate your salary. It's the single biggest lever for increasing your lifetime earnings.",
    category: "Mindset",
  },
  {
    id: 41,
    text: "Buy experiences, not things. Experiences appreciate in memory; things depreciate in value.",
    category: "Mindset",
  },
  {
    id: 42,
    text: "Frugality isn't about being cheap; it's about being resourceful.",
    category: "Savings",
  },
  {
    id: 43,
    text: "The 72 Rule: Divide 72 by the interest rate to see how many years it takes to double your money.",
    category: "Investing",
  },
  {
    id: 44,
    text: "Don't loan money to friends or family unless you're willing to make it a gift.",
    category: "Debt",
  },
  {
    id: 45,
    text: "Review your financial goals annually and adjust your plan as life changes.",
    category: "Mindset",
  },
  {
    id: 46,
    text: "Tax planning is an integral part of financial planning, but don't let the tax tail wag the investment dog.",
    category: "Investing",
  },
  {
    id: 47,
    text: "A penny saved is a penny earned.",
    category: "Savings",
    author: "Benjamin Franklin",
  },
  {
    id: 48,
    text: "Formal education will make you a living; self-education will make you a fortune.",
    category: "Mindset",
    author: "Jim Rohn",
  },
  {
    id: 49,
    text: "Too many people spend money they haven't earned, to buy things they don't want, to impress people they don't like.",
    category: "Mindset",
    author: "Will Rogers",
  },
  {
    id: 50,
    text: "The most important investment you can make is in yourself.",
    category: "Mindset",
    author: "Warren Buffett",
  },
];

export const getDailyTip = (): Tip => {
  // Use the current date to select a tip
  // This ensures the tip stays the same for the entire day
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const diff = today.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Use modulo to cycle through tips if we have more days than tips
  const tipIndex = dayOfYear % tips.length;
  
  return tips[tipIndex];
};
