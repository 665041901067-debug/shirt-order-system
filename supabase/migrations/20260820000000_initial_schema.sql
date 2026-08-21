-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id TEXT,
    first_name TEXT,
    last_name TEXT,
    nickname TEXT,
    phone TEXT,
    academic_year TEXT,
    major TEXT DEFAULT 'วิศวกรรมคอมพิวเตอร์และระบบ IoT',
    role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ADMIN')),
    admin_permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    banner_url TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'OPEN', 'PAUSED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    category TEXT DEFAULT 'ทั่วไป',
    preview_enabled BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PRODUCT IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type TEXT NOT NULL DEFAULT 'MAIN' CHECK (image_type IN ('MAIN', 'FRONT', 'BACK', 'DETAIL', 'SIZE_CHART', 'GALLERY')),
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PRODUCT SIZES TABLE
CREATE TABLE IF NOT EXISTS public.product_sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size_name TEXT NOT NULL,
    price_adjustment NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. OPTION GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.option_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. OPTION VALUES TABLE
CREATE TABLE IF NOT EXISTS public.option_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    price_adjustment NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PRODUCT OPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.product_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, group_id)
);

-- 9. CARTS TABLE
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. CART ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size_id UUID NOT NULL REFERENCES public.product_sizes(id) ON DELETE CASCADE,
    custom_name TEXT,
    custom_number TEXT,
    note TEXT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. CART ITEM OPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.cart_item_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_item_id UUID NOT NULL REFERENCES public.cart_items(id) ON DELETE CASCADE,
    option_value_id UUID NOT NULL REFERENCES public.option_values(id) ON DELETE CASCADE
);

-- 12. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN (
        'PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PAID', 'ORDER_ACCEPTED', 
        'PREPARING', 'PRODUCTION', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'
    )),
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    size_adjustments NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    option_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. ORDER ITEMS TABLE (SNAPSHOT PRESERVATION)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    size_id UUID REFERENCES public.product_sizes(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    base_price_snapshot NUMERIC(10, 2) NOT NULL,
    size_name_snapshot TEXT NOT NULL,
    size_price_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    custom_name TEXT,
    custom_number TEXT,
    note TEXT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. ORDER ITEM OPTIONS TABLE (SNAPSHOT PRESERVATION)
CREATE TABLE IF NOT EXISTS public.order_item_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    option_group_name_snapshot TEXT NOT NULL,
    option_label_snapshot TEXT NOT NULL,
    price_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

-- 15. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('QR_PAYMENT', 'CASH', 'BANK_TRANSFER')),
    slip_url TEXT,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. PAYMENT METHODS TABLE
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('QR_PAYMENT', 'CASH', 'BANK_TRANSFER')),
    bank_name TEXT,
    account_name TEXT,
    account_number TEXT,
    promptpay_no TEXT,
    qr_image_url TEXT,
    instruction TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. ORDER STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'ORDER_STATUS' CHECK (type IN ('ORDER_STATUS', 'PAYMENT', 'SYSTEM')),
    read BOOLEAN NOT NULL DEFAULT false,
    link_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. PRODUCTION BATCHES TABLE
CREATE TABLE IF NOT EXISTS public.production_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'PLANNED',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_campaign ON public.products(campaign_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product ON public.product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);

-- TRIGGER FOR UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_product_sizes_updated_at BEFORE UPDATE ON public.product_sizes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_carts_updated_at BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- TRIGGER TO CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'STUDENT'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

----------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
----------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTION FOR CHECKING ADMIN ROLE IN RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES RLS
CREATE POLICY "Users can view own profile or Admin can view all"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can insert own profile or Admin can insert"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update own profile or Admin can update"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR is_admin());

-- CAMPAIGNS RLS
CREATE POLICY "Everyone can view active campaigns"
    ON public.campaigns FOR SELECT
    USING (true);

CREATE POLICY "Only admin can insert/update/delete campaigns"
    ON public.campaigns FOR ALL
    USING (is_admin());

-- PRODUCTS RLS
CREATE POLICY "Everyone can view active products"
    ON public.products FOR SELECT
    USING (is_active = true OR is_admin());

CREATE POLICY "Only admin can modify products"
    ON public.products FOR ALL
    USING (is_admin());

-- PRODUCT IMAGES, SIZES, OPTIONS RLS
CREATE POLICY "Everyone can view product details" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admin modify product images" ON public.product_images FOR ALL USING (is_admin());

CREATE POLICY "Everyone can view product sizes" ON public.product_sizes FOR SELECT USING (true);
CREATE POLICY "Admin modify product sizes" ON public.product_sizes FOR ALL USING (is_admin());

CREATE POLICY "Everyone can view option groups" ON public.option_groups FOR SELECT USING (true);
CREATE POLICY "Admin modify option groups" ON public.option_groups FOR ALL USING (is_admin());

CREATE POLICY "Everyone can view option values" ON public.option_values FOR SELECT USING (true);
CREATE POLICY "Admin modify option values" ON public.option_values FOR ALL USING (is_admin());

CREATE POLICY "Everyone can view product options" ON public.product_options FOR SELECT USING (true);
CREATE POLICY "Admin modify product options" ON public.product_options FOR ALL USING (is_admin());

-- CARTS RLS
CREATE POLICY "Users manage own cart"
    ON public.carts FOR ALL
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users manage own cart items"
    ON public.cart_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.carts
            WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()
        ) OR is_admin()
    );

CREATE POLICY "Users manage own cart item options"
    ON public.cart_item_options FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.cart_items
            JOIN public.carts ON carts.id = cart_items.cart_id
            WHERE cart_items.id = cart_item_options.cart_item_id AND carts.user_id = auth.uid()
        ) OR is_admin()
    );

-- ORDERS RLS
CREATE POLICY "Users view own orders or Admin view all"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users create own order"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin update orders"
    ON public.orders FOR UPDATE
    USING (is_admin());

-- ORDER ITEMS & OPTIONS RLS
CREATE POLICY "Users view own order items"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Users insert order items"
    ON public.order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users view own order item options"
    ON public.order_item_options FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.order_items
            JOIN public.orders ON orders.id = order_items.order_id
            WHERE order_items.id = order_item_options.order_item_id AND (orders.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Users insert order item options"
    ON public.order_item_options FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.order_items
            JOIN public.orders ON orders.id = order_items.order_id
            WHERE order_items.id = order_item_options.order_item_id AND orders.user_id = auth.uid()
        )
    );

-- PAYMENTS RLS
CREATE POLICY "Users view own payments or Admin view all"
    ON public.payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = payments.order_id AND (orders.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Users create payment for own order"
    ON public.payments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Admin or owner update payments"
    ON public.payments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = payments.order_id AND (orders.user_id = auth.uid() OR is_admin())
        )
    );

-- PAYMENT METHODS RLS
CREATE POLICY "Everyone can view active payment methods"
    ON public.payment_methods FOR SELECT
    USING (is_active = true OR is_admin());

CREATE POLICY "Admin modify payment methods"
    ON public.payment_methods FOR ALL
    USING (is_admin());

-- NOTIFICATIONS RLS
CREATE POLICY "Users view own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users update own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid() OR is_admin());

-- AUDIT LOGS & SYSTEM SETTINGS RLS
CREATE POLICY "Only admin view audit logs" ON public.audit_logs FOR SELECT USING (is_admin());
CREATE POLICY "Only admin view settings" ON public.system_settings FOR ALL USING (is_admin());

-- SUPABASE REALTIME PUBLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_sizes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
