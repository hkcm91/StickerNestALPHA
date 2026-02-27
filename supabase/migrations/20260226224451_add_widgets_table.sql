CREATE TABLE widgets (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0.0',
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    html_content TEXT NOT NULL,
    manifest JSONB NOT NULL,
    thumbnail_url TEXT,
    icon_url TEXT,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    license TEXT NOT NULL DEFAULT 'MIT',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    is_deprecated BOOLEAN NOT NULL DEFAULT FALSE,
    install_count INTEGER NOT NULL DEFAULT 0,
    rating_average DOUBLE PRECISION,
    rating_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    price_cents INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'usd',
    stripe_price_id TEXT,
    is_free BOOLEAN GENERATED ALWAYS AS (price_cents = 0) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_widgets_published ON widgets(is_published, is_deprecated) WHERE is_published = TRUE AND is_deprecated = FALSE;
CREATE INDEX idx_widgets_category ON widgets(category) WHERE is_published = TRUE;
CREATE INDEX idx_widgets_author_id ON widgets(author_id);
CREATE INDEX idx_widgets_slug ON widgets(slug);
CREATE INDEX idx_widgets_search ON widgets USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published widgets are readable" ON widgets
    FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Authors can manage own widgets" ON widgets
    FOR ALL USING (auth.uid() = author_id);;
