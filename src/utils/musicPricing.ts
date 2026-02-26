export const STANDARD_SINGLE_BASE_PRICE = 2.0;
export const STANDARD_TITHING_RATE = 0.10;
export const STANDARD_ADMIN_RATE = 0.05;

export const getStandardSinglePriceBreakdown = () => {
  const base = STANDARD_SINGLE_BASE_PRICE;
  const tithing = base * STANDARD_TITHING_RATE;
  const admin = base * STANDARD_ADMIN_RATE;
  const total = base + tithing + admin;

  return { base, tithing, admin, total };
};

export const getStandardSingleTotalPrice = () => getStandardSinglePriceBreakdown().total;
