const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  FAILED: 'failed',
});

module.exports = ORDER_STATUS;
