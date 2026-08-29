-- Close the disclosed gap from the booking-payment wiring: every other
-- create-*-order function runs the buyer total through computeBuyerFee
-- so the buyer, not the sower, absorbs PayPal's processor cut.
-- create-booking-paypal-order now does too — this is where it's stored.
-- bookings.amount/s2g_fee/total stay exactly as finalizeBooking/
-- syncBooking already use them (the sower/S2G split); this column is
-- purely the processor's own cut, charged on top, same as
-- basket_orders.processor_fee.
alter table public.bookings add column processor_fee numeric;
