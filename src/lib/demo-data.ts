import { Transaction } from '@/types/transaction';
import { calcTotal } from './calculations';

function t(
  id: number,
  date: string,
  partyName: string,
  type: Transaction['type'],
  itemName: string,
  quantity: number,
  ratePerUnit: number,
  narration: string
): Transaction {
  return {
    id: `seed-${id}`,
    partyId: '',
    date,
    partyName,
    narration,
    type,
    itemName,
    quantity,
    ratePerUnit,
    totalAmount: calcTotal(quantity, ratePerUnit),
    items: [{ itemName, quantity, unit: 'kg', ratePerUnit, totalAmount: calcTotal(quantity, ratePerUnit) }],
  };
}

export function getDemoTransactions(): Transaction[] {
  return [
    // ABC Traders - 12 transactions
    t(1, '2026-10-02', 'ABC Traders', 'Sale', 'HDPE Granules', 500, 82, 'Dispatched via truck to Kalol warehouse.'),
    t(2, '2026-09-25', 'ABC Traders', 'Purchase', 'Plastic Scrap', 1200, 38, 'Mixed colour scrap, sorted at yard.'),
    t(3, '2026-09-18', 'ABC Traders', 'Sale', 'PP Granules', 300, 95, 'Natural grade, packed in 25kg bags.'),
    t(4, '2026-09-10', 'ABC Traders', 'Sale', 'PVC Resin', 250, 110, 'Suspension grade, delivery to Vapi.'),
    t(5, '2026-08-28', 'ABC Traders', 'Purchase', 'LDPE Granules', 800, 62, 'Film grade, slightly off-spec.'),
    t(6, '2026-08-15', 'ABC Traders', 'Sale', 'Plastic Containers', 1500, 24, '1 litre containers, assorted lids.'),
    t(7, '2026-08-03', 'ABC Traders', 'Sale', 'HDPE Granules', 450, 85, 'Blow-moulding grade.'),
    t(8, '2026-07-22', 'ABC Traders', 'Purchase', 'PP Granules', 600, 90, 'Recycled, washed flakes.'),
    t(9, '2026-07-09', 'ABC Traders', 'Sale', 'PVC Resin', 180, 112, 'K67 grade for pipe fitting.'),
    t(10, '2026-06-25', 'ABC Traders', 'Sale', 'LDPE Granules', 220, 64, 'Coating grade.'),
    t(11, '2026-06-12', 'ABC Traders', 'Purchase', 'Plastic Scrap', 1000, 36, 'Industrial mixed scrap.'),
    t(12, '2026-05-30', 'ABC Traders', 'Sale', 'PP Granules', 380, 97, 'Copo grade, 25kg bags.'),

    // Shree Enterprises - 4 transactions
    t(13, '2026-10-05', 'Shree Enterprises', 'Sale', 'HDPE Granules', 300, 84, 'Delivery confirmed by Ramesh.'),
    t(14, '2026-09-20', 'Shree Enterprises', 'Purchase', 'Plastic Scrap', 900, 40, 'Washed, sorted by colour.'),
    t(15, '2026-08-22', 'Shree Enterprises', 'Sale', 'PVC Resin', 200, 108, 'For pipe manufacturing.'),
    t(16, '2026-07-15', 'Shree Enterprises', 'Sale', 'Plastic Containers', 800, 26, '500ml containers.'),

    // Modern Polymers - 3 transactions
    t(17, '2026-10-08', 'Modern Polymers', 'Purchase', 'PP Granules', 500, 92, 'Virgin material, ex-Reliance.'),
    t(18, '2026-09-12', 'Modern Polymers', 'Sale', 'LDPE Granules', 400, 63, 'Film grade, 25kg bags.'),
    t(19, '2026-08-05', 'Modern Polymers', 'Sale', 'HDPE Granules', 350, 86, 'Injection moulding grade.'),

    // National Plastics - 3 transactions
    t(20, '2026-10-10', 'National Plastics', 'Sale', 'PVC Resin', 280, 115, 'K57 grade, bulk delivery.'),
    t(21, '2026-09-05', 'National Plastics', 'Purchase', 'Plastic Scrap', 700, 34, 'Post-industrial, clean.'),
    t(22, '2026-08-18', 'National Plastics', 'Sale', 'Plastic Containers', 1200, 23, '5 litre jerry cans.'),

    // Patel Polymers - 1 transaction (extra variety)
    t(23, '2026-10-12', 'Patel Polymers', 'Sale', 'PP Granules', 260, 99, 'Sample order, new client.'),
  ];
}

export function getDemoParties() {
  return [
    { id: 'demo-1', name: 'ABC Traders', partyType: 'debtor', location: 'Kalol, Gujarat', investment: 50000, initialLoss: 5000, isActive: true },
    { id: 'demo-2', name: 'Shree Enterprises', partyType: 'creditor', location: 'Ahmedabad, Gujarat', investment: 25000, initialLoss: 0, isActive: true },
    { id: 'demo-3', name: 'Modern Polymers', partyType: 'debtor', location: 'Surat, Gujarat', investment: 10000, initialLoss: 2000, isActive: true },
    { id: 'demo-4', name: 'National Plastics', partyType: 'creditor', location: 'Vapi, Gujarat', investment: 0, initialLoss: 0, isActive: true },
    { id: 'demo-5', name: 'Patel Polymers', partyType: 'suspense', location: 'Vadodara, Gujarat', investment: 0, initialLoss: 0, isActive: true },
  ];
}
