// Name pools, department variants and tier recipes for the Level 04 student dataset generator.
import type { Tier } from './types'

export const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Rohan', 'Priya', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Ishaan', 'Meera',
  'Karthik', 'Divya', 'Siddharth', 'Pooja', 'Rahul', 'Nisha', 'Aditya', 'Lakshmi', 'Varun', 'Shreya',
  'Harish', 'Anjali', 'Nikhil', 'Deepa', 'Manoj', 'Riya', 'Suresh', 'Tanvi', 'Gautam', 'Bhavana',
  'Emma', 'Liam', 'Sofia', 'Noah', 'Mei', 'Kenji', 'Amara', 'Lucas', 'Fatima', 'Omar',
  'Chloe', 'Mateo', 'Hana', 'Daniel', 'Zara', 'Elena', 'Yusuf', 'Ingrid', 'Kwame', 'Lena',
]

export const LAST_NAMES = [
  'Sharma', 'Iyer', 'Reddy', 'Patel', 'Nair', 'Gupta', 'Menon', 'Rao', 'Singh', 'Kumar',
  'Joshi', 'Pillai', 'Das', 'Bose', 'Mehta', 'Krishnan', 'Verma', 'Chopra', 'Kulkarni', 'Banerjee',
  'Smith', 'Garcia', 'Chen', 'Tanaka', 'Okafor', 'Rossi', 'Novak', 'Hassan', 'Silva', 'Muller',
  'Kim', 'Haddad', 'Larsen', 'Mensah', 'Petrov', 'Dubois', 'Costa', 'Ali', 'Nguyen', 'Brown',
]

/** Variants for each canonical department. All are fixable with strip + title + a replace map. */
export const DEPT_VARIANTS: Record<string, string[]> = {
  'Computer Science': ['CS', ' cs  ', 'Comp Sci', 'COMPUTER SCIENCE', 'cs', 'computer science', ' Computer Science'],
  Mechanical: ['mech', 'MECHANICAL', 'Mechanical ', 'mechanical', ' Mech'],
  Electrical: [' Electrical  ', 'ELECTRICAL', 'electrical', 'Elec', ' elec'],
  Civil: ['civil', 'CIVIL', ' Civil ', 'Civil  '],
}

/** Assisted tier: exactly these six variants, one row each. */
export const ASSISTED_VARIANTS: Array<[string, string]> = [
  ['Computer Science', 'CS'],
  ['Computer Science', ' cs  '],
  ['Computer Science', 'Comp Sci'],
  ['Computer Science', 'COMPUTER SCIENCE'],
  ['Mechanical', 'mech'],
  ['Electrical', ' Electrical  '],
]

export interface TierRecipe {
  legit: number
  exactDup: number
  nearDup: number
  attendanceNull: number
  /** Share of attendance blanks that must belong to dropouts (informative missingness). */
  attendanceNullDropoutShare: number
  cgpaNull: number
  cgpaPlaceholder: number
  deptVariants: number
  invalidAge: number
  invalidCgpa: number
  attendanceHigh: number
  attendanceNegative: number
  cgpaAsText: boolean
}

export const RECIPES: Record<Tier, TierRecipe> = {
  assisted: {
    legit: 40, exactDup: 3, nearDup: 0, attendanceNull: 5, attendanceNullDropoutShare: 0, cgpaNull: 0,
    cgpaPlaceholder: 0, deptVariants: 6, invalidAge: 2, invalidCgpa: 1, attendanceHigh: 0, attendanceNegative: 0, cgpaAsText: false,
  },
  independent: {
    legit: 150, exactDup: 6, nearDup: 3, attendanceNull: 8, attendanceNullDropoutShare: 0, cgpaNull: 4,
    cgpaPlaceholder: 4, deptVariants: 20, invalidAge: 4, invalidCgpa: 3, attendanceHigh: 2, attendanceNegative: 0, cgpaAsText: true,
  },
  expert: {
    legit: 300, exactDup: 6, nearDup: 14, attendanceNull: 24, attendanceNullDropoutShare: 0.7, cgpaNull: 8,
    cgpaPlaceholder: 10, deptVariants: 45, invalidAge: 6, invalidCgpa: 5, attendanceHigh: 4, attendanceNegative: 2, cgpaAsText: true,
  },
}

export const GHOST_COUNT = 4
