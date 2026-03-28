import { GetOrdersHandler } from './get-orders.handler';
import { GetOrderHandler } from './get-order.handler';

export const OrderQueryHandlers = [GetOrdersHandler, GetOrderHandler];

export { GetOrdersQuery } from './get-orders.query';
export { GetOrderQuery } from './get-order.query';
