--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (Homebrew)
-- Dumped by pg_dump version 17.4

-- Started on 2026-03-26 15:56:29 +08

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 894 (class 1247 OID 32952)
-- Name: LiveStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LiveStatus" AS ENUM (
    'SCHEDULED',
    'LIVE',
    'ENDED'
);


ALTER TYPE public."LiveStatus" OWNER TO postgres;

--
-- TOC entry 891 (class 1247 OID 32940)
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'SHIPPED',
    'COMPLETED',
    'CANCELED'
);


ALTER TYPE public."OrderStatus" OWNER TO postgres;

--
-- TOC entry 888 (class 1247 OID 32932)
-- Name: ProductStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProductStatus" AS ENUM (
    'ACTIVE',
    'DRAFT',
    'OUT_OF_STOCK'
);


ALTER TYPE public."ProductStatus" OWNER TO postgres;

--
-- TOC entry 885 (class 1247 OID 32924)
-- Name: ProductType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProductType" AS ENUM (
    'READY',
    'PREORDER',
    'LIVE'
);


ALTER TYPE public."ProductType" OWNER TO postgres;

--
-- TOC entry 882 (class 1247 OID 32918)
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'CUSTOMER'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 238 (class 1259 OID 33697)
-- Name: AdminBanner; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminBanner" (
    id integer NOT NULL,
    description text,
    image_url text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AdminBanner" OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 33696)
-- Name: AdminBanner_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AdminBanner_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AdminBanner_id_seq" OWNER TO postgres;

--
-- TOC entry 4054 (class 0 OID 0)
-- Dependencies: 237
-- Name: AdminBanner_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AdminBanner_id_seq" OWNED BY public."AdminBanner".id;


--
-- TOC entry 230 (class 1259 OID 33657)
-- Name: AdminBrand; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminBrand" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    image_url text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AdminBrand" OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 33656)
-- Name: AdminBrand_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AdminBrand_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AdminBrand_id_seq" OWNER TO postgres;

--
-- TOC entry 4055 (class 0 OID 0)
-- Dependencies: 229
-- Name: AdminBrand_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AdminBrand_id_seq" OWNED BY public."AdminBrand".id;


--
-- TOC entry 226 (class 1259 OID 33637)
-- Name: AdminCategory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminCategory" (
    id integer NOT NULL,
    category_name text NOT NULL,
    description text,
    category_image text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AdminCategory" OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 33636)
-- Name: AdminCategory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AdminCategory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AdminCategory_id_seq" OWNER TO postgres;

--
-- TOC entry 4056 (class 0 OID 0)
-- Dependencies: 225
-- Name: AdminCategory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AdminCategory_id_seq" OWNED BY public."AdminCategory".id;


--
-- TOC entry 246 (class 1259 OID 33737)
-- Name: AdminOrder; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminOrder" (
    id integer NOT NULL,
    name text NOT NULL,
    email text,
    phone1 text NOT NULL,
    phone2 text,
    status text DEFAULT 'pending'::text NOT NULL,
    total integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    user_id text
);


ALTER TABLE public."AdminOrder" OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 33749)
-- Name: AdminOrderItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminOrderItem" (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    price integer NOT NULL,
    image_url text,
    status text DEFAULT 'pending'::text NOT NULL
);


ALTER TABLE public."AdminOrderItem" OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 33748)
-- Name: AdminOrderItem_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AdminOrderItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AdminOrderItem_id_seq" OWNER TO postgres;

--
-- TOC entry 4057 (class 0 OID 0)
-- Dependencies: 247
-- Name: AdminOrderItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AdminOrderItem_id_seq" OWNED BY public."AdminOrderItem".id;


--
-- TOC entry 245 (class 1259 OID 33736)
-- Name: AdminOrder_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AdminOrder_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AdminOrder_id_seq" OWNER TO postgres;

--
-- TOC entry 4058 (class 0 OID 0)
-- Dependencies: 245
-- Name: AdminOrder_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AdminOrder_id_seq" OWNED BY public."AdminOrder".id;


--
-- TOC entry 240 (class 1259 OID 33707)
-- Name: AdminProduct; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminProduct" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    price integer NOT NULL,
    discount_price integer,
    stock integer NOT NULL,
    material text,
    category_id integer,
    subcategory_id integer,
    brand_id integer,
    unit_id integer,
    status_id integer,
    type_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    duration_hours integer
);


ALTER TABLE public."AdminProduct" OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 33717)
-- Name: AdminProductImage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminProductImage" (
    id integer NOT NULL,
    image_url text NOT NULL,
    public_id text,
    product_id integer,
    product_variant_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AdminProductImage" OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 33716)
-- Name: AdminProductImage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AdminProductImage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AdminProductImage_id_seq" OWNER TO postgres;

--
-- TOC entry 4059 (class 0 OID 0)
-- Dependencies: 241
-- Name: AdminProductImage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AdminProductImage_id_seq" OWNED BY public."AdminProductImage".id;


--
-- TOC entry 244 (class 1259 OID 33727)
-- Name: AdminProductVariant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminProductVariant" (
    id integer NOT NULL,
    product_id integer NOT NULL,
    sku text,
    attribute jsonb,
    price integer,
    stock integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AdminProductVariant" OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 33726)
-- Name: AdminProductVariant_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AdminProductVariant_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AdminProductVariant_id_seq" OWNER TO postgres;

--
-- TOC entry 4060 (class 0 OID 0)
-- Dependencies: 243
-- Name: AdminProductVariant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AdminProductVariant_id_seq" OWNED BY public."AdminProductVariant".id;


--
-- TOC entry 239 (class 1259 OID 33706)
-- Name: AdminProduct_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AdminProduct_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AdminProduct_id_seq" OWNER TO postgres;

--
-- TOC entry 4061 (class 0 OID 0)
-- Dependencies: 239
-- Name: AdminProduct_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AdminProduct_id_seq" OWNED BY public."AdminProduct".id;


--
-- TOC entry 250 (class 1259 OID 41746)
-- Name: AdminPromo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminPromo" (
    id integer NOT NULL,
    badge text,
    title text,
    subtitle text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AdminPromo" OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 41745)
-- Name: AdminPromo_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AdminPromo_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AdminPromo_id_seq" OWNER TO postgres;

--
-- TOC entry 4062 (class 0 OID 0)
-- Dependencies: 249
-- Name: AdminPromo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AdminPromo_id_seq" OWNED BY public."AdminPromo".id;


--
-- TOC entry 234 (class 1259 OID 33677)
-- Name: AdminStatus; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminStatus" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AdminStatus" OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 33676)
-- Name: AdminStatus_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AdminStatus_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AdminStatus_id_seq" OWNER TO postgres;

--
-- TOC entry 4063 (class 0 OID 0)
-- Dependencies: 233
-- Name: AdminStatus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AdminStatus_id_seq" OWNED BY public."AdminStatus".id;


--
-- TOC entry 228 (class 1259 OID 33647)
-- Name: AdminSubCategory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminSubCategory" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    category_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AdminSubCategory" OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 33646)
-- Name: AdminSubCategory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AdminSubCategory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AdminSubCategory_id_seq" OWNER TO postgres;

--
-- TOC entry 4064 (class 0 OID 0)
-- Dependencies: 227
-- Name: AdminSubCategory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AdminSubCategory_id_seq" OWNED BY public."AdminSubCategory".id;


--
-- TOC entry 236 (class 1259 OID 33687)
-- Name: AdminType; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminType" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    has_duration boolean DEFAULT false NOT NULL
);


ALTER TABLE public."AdminType" OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 33686)
-- Name: AdminType_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AdminType_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AdminType_id_seq" OWNER TO postgres;

--
-- TOC entry 4065 (class 0 OID 0)
-- Dependencies: 235
-- Name: AdminType_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AdminType_id_seq" OWNED BY public."AdminType".id;


--
-- TOC entry 232 (class 1259 OID 33667)
-- Name: AdminUnit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminUnit" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AdminUnit" OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 33666)
-- Name: AdminUnit_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AdminUnit_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AdminUnit_id_seq" OWNER TO postgres;

--
-- TOC entry 4066 (class 0 OID 0)
-- Dependencies: 231
-- Name: AdminUnit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AdminUnit_id_seq" OWNED BY public."AdminUnit".id;


--
-- TOC entry 219 (class 1259 OID 32968)
-- Name: Category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Category" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "parentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Category" OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 32996)
-- Name: LiveItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LiveItem" (
    id text NOT NULL,
    "liveSessionId" text NOT NULL,
    "productId" text NOT NULL,
    "livePrice" integer,
    "availableQty" integer
);


ALTER TABLE public."LiveItem" OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 32987)
-- Name: LiveSession; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LiveSession" (
    id text NOT NULL,
    title text NOT NULL,
    "startsAt" timestamp(3) without time zone NOT NULL,
    "endsAt" timestamp(3) without time zone,
    status public."LiveStatus" DEFAULT 'SCHEDULED'::public."LiveStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LiveSession" OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 33003)
-- Name: Order; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "userId" text,
    status public."OrderStatus" DEFAULT 'PENDING'::public."OrderStatus" NOT NULL,
    "orderType" public."ProductType" NOT NULL,
    total integer NOT NULL,
    currency text DEFAULT 'MNT'::text NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Order" OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 33013)
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    "unitPrice" integer NOT NULL
);


ALTER TABLE public."OrderItem" OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 32976)
-- Name: Product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    price integer NOT NULL,
    "salePrice" integer,
    currency text DEFAULT 'MNT'::text NOT NULL,
    type public."ProductType" NOT NULL,
    status public."ProductStatus" DEFAULT 'ACTIVE'::public."ProductStatus" NOT NULL,
    sku text,
    "stockQty" integer,
    "thumbnailUrl" text,
    images text[] DEFAULT ARRAY[]::text[],
    "categoryId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Product" OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 32959)
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text,
    email text,
    phone text,
    role public."UserRole" DEFAULT 'CUSTOMER'::public."UserRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "passwordHash" text NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 32906)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- TOC entry 3790 (class 2604 OID 33700)
-- Name: AdminBanner id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminBanner" ALTER COLUMN id SET DEFAULT nextval('public."AdminBanner_id_seq"'::regclass);


--
-- TOC entry 3781 (class 2604 OID 33660)
-- Name: AdminBrand id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminBrand" ALTER COLUMN id SET DEFAULT nextval('public."AdminBrand_id_seq"'::regclass);


--
-- TOC entry 3777 (class 2604 OID 33640)
-- Name: AdminCategory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminCategory" ALTER COLUMN id SET DEFAULT nextval('public."AdminCategory_id_seq"'::regclass);


--
-- TOC entry 3798 (class 2604 OID 33740)
-- Name: AdminOrder id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminOrder" ALTER COLUMN id SET DEFAULT nextval('public."AdminOrder_id_seq"'::regclass);


--
-- TOC entry 3802 (class 2604 OID 33752)
-- Name: AdminOrderItem id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminOrderItem" ALTER COLUMN id SET DEFAULT nextval('public."AdminOrderItem_id_seq"'::regclass);


--
-- TOC entry 3792 (class 2604 OID 33710)
-- Name: AdminProduct id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProduct" ALTER COLUMN id SET DEFAULT nextval('public."AdminProduct_id_seq"'::regclass);


--
-- TOC entry 3794 (class 2604 OID 33720)
-- Name: AdminProductImage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProductImage" ALTER COLUMN id SET DEFAULT nextval('public."AdminProductImage_id_seq"'::regclass);


--
-- TOC entry 3796 (class 2604 OID 33730)
-- Name: AdminProductVariant id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProductVariant" ALTER COLUMN id SET DEFAULT nextval('public."AdminProductVariant_id_seq"'::regclass);


--
-- TOC entry 3804 (class 2604 OID 41749)
-- Name: AdminPromo id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminPromo" ALTER COLUMN id SET DEFAULT nextval('public."AdminPromo_id_seq"'::regclass);


--
-- TOC entry 3785 (class 2604 OID 33680)
-- Name: AdminStatus id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminStatus" ALTER COLUMN id SET DEFAULT nextval('public."AdminStatus_id_seq"'::regclass);


--
-- TOC entry 3779 (class 2604 OID 33650)
-- Name: AdminSubCategory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminSubCategory" ALTER COLUMN id SET DEFAULT nextval('public."AdminSubCategory_id_seq"'::regclass);


--
-- TOC entry 3787 (class 2604 OID 33690)
-- Name: AdminType id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminType" ALTER COLUMN id SET DEFAULT nextval('public."AdminType_id_seq"'::regclass);


--
-- TOC entry 3783 (class 2604 OID 33670)
-- Name: AdminUnit id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminUnit" ALTER COLUMN id SET DEFAULT nextval('public."AdminUnit_id_seq"'::regclass);


--
-- TOC entry 4036 (class 0 OID 33697)
-- Dependencies: 238
-- Data for Name: AdminBanner; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminBanner" (id, description, image_url, created_at, updated_at) FROM stdin;
1	zahialga	/uploads/1773823966692-s73wwj-banner3.webp	2026-03-18 08:52:46.694	2026-03-18 08:52:46.694
2	\N	/uploads/1774016917771-i5ook1-587384e4-ee43-41e5-8cc0-413e237a00d1.webp	2026-03-20 14:28:37.773	2026-03-20 14:28:37.773
\.


--
-- TOC entry 4028 (class 0 OID 33657)
-- Dependencies: 230
-- Data for Name: AdminBrand; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminBrand" (id, name, description, image_url, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4024 (class 0 OID 33637)
-- Dependencies: 226
-- Data for Name: AdminCategory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminCategory" (id, category_name, description, category_image, created_at, updated_at) FROM stdin;
1	Бэлэн хувцас	эрэгтэй, эмэгтэй, бүх төрлийн хувцас	\N	2026-03-18 12:31:14.757	2026-03-18 12:31:14.757
2	Гэр ахуйн бараа	\N	\N	2026-03-20 04:37:43.857	2026-03-20 04:37:43.857
3	Хүнс	\N	\N	2026-03-20 04:37:57.137	2026-03-20 04:37:57.137
4	Бэлэг дурсгал	\N	\N	2026-03-20 04:51:46.494	2026-03-20 04:51:46.494
\.


--
-- TOC entry 4044 (class 0 OID 33737)
-- Dependencies: 246
-- Data for Name: AdminOrder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminOrder" (id, name, email, phone1, phone2, status, total, created_at, updated_at, user_id) FROM stdin;
1	99095413	\N	99095413	\N	бараа олгосон	1560000	2026-03-20 13:12:46.072	2026-03-26 06:58:42.61	cmmt0lvwl000014noe5g2meqc
2	99095413	\N	99095413	\N	completed	765000	2026-03-24 03:49:33.631	2026-03-26 06:59:04.256	cmmt0lvwl000014noe5g2meqc
\.


--
-- TOC entry 4046 (class 0 OID 33749)
-- Dependencies: 248
-- Data for Name: AdminOrderItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminOrderItem" (id, order_id, product_name, quantity, price, image_url, status) FROM stdin;
1	1	бараа нэр	2	15000	/uploads/1773981725858-jxgu92-IMG_0041.jpeg	pending
2	1	JENSLEV Dining room cabinet | JENSLEV | 2 doors, 4 drawers | engineered wood | oak color | W118xD36xH89cm	2	765000	/uploads/1774008916272-7axgyj-505a6628-2c6e-4105-8947-42d7d72bfe1c.webp	handed
3	2	JENSLEV Dining room cabinet | JENSLEV | 2 doors, 4 drawers | engineered wood | oak color | W118xD36xH89cm	1	765000	/uploads/1774008916272-7axgyj-505a6628-2c6e-4105-8947-42d7d72bfe1c.webp	бараа олгосон
\.


--
-- TOC entry 4038 (class 0 OID 33707)
-- Dependencies: 240
-- Data for Name: AdminProduct; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminProduct" (id, name, description, price, discount_price, stock, material, category_id, subcategory_id, brand_id, unit_id, status_id, type_id, created_at, updated_at, duration_hours) FROM stdin;
1	бараа нэр	тайлбар	15000	\N	50	\N	1	2	\N	\N	\N	2	2026-03-20 04:42:05.865	2026-03-20 04:42:05.865	\N
4	baraa1 zahialgiin	tailbar zahialgiin baraanii	12800	\N	300	\N	\N	\N	\N	\N	\N	1	2026-03-26 03:18:28.966	2026-03-26 03:18:28.966	\N
5	zahialgiin baraa burtgel	tailbar	12000	\N	25	\N	\N	\N	\N	\N	\N	1	2026-03-26 06:02:43.134	2026-03-26 06:02:43.134	72
6	belen baraa burgeh	tailbar oruulah heseg	15000	\N	50	\N	2	4	\N	\N	\N	2	2026-03-26 06:04:34.681	2026-03-26 06:04:34.681	\N
3	baraa1 zahialgiin	tailbar zahialgin baraanii gants torliin baraa baigaa uyd hemjee ongo geed bugdiin end bichij bolno	24000	19200	100	mod	1	2	\N	\N	\N	2	2026-03-26 03:10:16.802	2026-03-26 06:35:36.084	\N
2	JENSLEV Dining room cabinet | JENSLEV | 2 doors, 4 drawers | engineered wood | oak color | W118xD36xH89cm	JENSLEV хоолны өрөөний шүүгээ – Минималист, орчин үеийн загвар\n\nХоолны өрөөний шүүгээ нь гэртээ эмх цэгцтэй байлгах нэмэлт хадгалах орон зайг бүрдүүлж, мөн таны стиль, интерьерийг чимэх үүрэгтэй. JENSLEV хоолны өрөөний шүүгээ нь Скандинав орон зайд тохирох минималист, орчин үеийн дизайнаараа танигддаг.\n\nМинималист, дэгжин загвар\n\nJENSLEV хоолны өрөөний шүүгээ нь байгалийн модны өнгөөр хийгдсэн, орчин үеийн минималист дизайнаараа дэгжин төрхийг бий болгож, олон төрлийн хэрэглээнд ашиглах боломжтой. Энэ нь хоолны өрөө, зочны өрөө, унтлагын өрөө гэх мэт олон орон зайд тохиромжтой.\nНорвегийн хэв маягийн дөрвөлжин хэлбэр болон минималист шугамууд нь орон зайн гоо зүйг нэмэгдүүлнэ.\n\nБат бөх, өндөр чанартай материал	850000	722500	10	мод	2	4	\N	\N	\N	2	2026-03-20 12:15:16.301	2026-03-26 06:37:17.391	\N
\.


--
-- TOC entry 4040 (class 0 OID 33717)
-- Dependencies: 242
-- Data for Name: AdminProductImage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminProductImage" (id, image_url, public_id, product_id, product_variant_id, created_at) FROM stdin;
1	/uploads/1773981725858-jxgu92-IMG_0041.jpeg	1773981725858-jxgu92-IMG_0041.jpeg	1	\N	2026-03-20 04:42:05.865
7	/uploads/1774495108954-53wcxv-Screenshot 2026-03-20 at 20.22.41.png	1774495108954-53wcxv-Screenshot 2026-03-20 at 20.22.41.png	4	\N	2026-03-26 03:18:28.966
8	/uploads/1774504963120-qba5ca-qr-news-299.png	1774504963120-qba5ca-qr-news-299.png	5	\N	2026-03-26 06:02:43.134
9	/uploads/1774505074651-a8wbtd-777.png	1774505074651-a8wbtd-777.png	6	\N	2026-03-26 06:04:34.681
10	/uploads/1774494616794-af2j55-Screenshot 2026-03-20 at 20.22.41.png	1774494616794-af2j55-Screenshot 2026-03-20 at 20.22.41.png	3	\N	2026-03-26 06:35:36.088
11	/uploads/1774008916272-7axgyj-505a6628-2c6e-4105-8947-42d7d72bfe1c.webp	1774008916272-7axgyj-505a6628-2c6e-4105-8947-42d7d72bfe1c.webp	2	\N	2026-03-26 06:37:17.396
12	/uploads/1774008916274-oj1nqr-587384e4-ee43-41e5-8cc0-413e237a00d1.webp	1774008916274-oj1nqr-587384e4-ee43-41e5-8cc0-413e237a00d1.webp	2	\N	2026-03-26 06:37:17.396
13	/uploads/1774008916274-92b8jw-ab2c96dd-59f6-4e43-8859-fe831e073e64.webp	1774008916274-92b8jw-ab2c96dd-59f6-4e43-8859-fe831e073e64.webp	2	\N	2026-03-26 06:37:17.396
14	/uploads/1774008916275-6myf1f-c2cd510b-bbba-49af-96cb-84076b763cb4.webp	1774008916275-6myf1f-c2cd510b-bbba-49af-96cb-84076b763cb4.webp	2	\N	2026-03-26 06:37:17.396
\.


--
-- TOC entry 4042 (class 0 OID 33727)
-- Dependencies: 244
-- Data for Name: AdminProductVariant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminProductVariant" (id, product_id, sku, attribute, price, stock, created_at, updated_at) FROM stdin;
1	2	200x180	{"size": "том", "type": "2 hunii", "color": "саарал", "зузаан": "40cm"}	180000	85	2026-03-24 04:12:13.757	2026-03-24 04:12:13.757
2	2	200x150	{"type": "1hunii", "color": "saaral", "зузаан": "30cm"}	110000	23	2026-03-24 04:13:42.442	2026-03-24 04:13:42.442
\.


--
-- TOC entry 4048 (class 0 OID 41746)
-- Dependencies: 250
-- Data for Name: AdminPromo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminPromo" (id, badge, title, subtitle, created_at, updated_at) FROM stdin;
1	Онцгой хямдрал	LIVE бараа шинэчлэгдлээ	24 цагийн дотор дуусна.	2026-03-26 06:22:24.536	2026-03-26 06:22:24.536
\.


--
-- TOC entry 4032 (class 0 OID 33677)
-- Dependencies: 234
-- Data for Name: AdminStatus; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminStatus" (id, name, description, created_at, updated_at) FROM stdin;
1	хүлээгдэж байгаа	\N	2026-03-20 03:57:23.307	2026-03-20 03:57:23.307
2	бараа ирсэн	\N	2026-03-20 03:57:34.678	2026-03-20 03:57:34.678
3	бараа олгосон	\N	2026-03-20 03:57:47.166	2026-03-20 03:57:47.166
4	баталгаажсан	\N	2026-03-24 04:25:23.698	2026-03-24 04:25:23.698
\.


--
-- TOC entry 4026 (class 0 OID 33647)
-- Dependencies: 228
-- Data for Name: AdminSubCategory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminSubCategory" (id, name, description, category_id, created_at, updated_at) FROM stdin;
1	huuhdiin huvtsas	\N	1	2026-03-20 03:54:14.985	2026-03-20 03:54:14.985
2	цүнх	\N	1	2026-03-20 04:38:47.218	2026-03-20 04:38:47.218
3	Гал тогооны хэрэгсэл	\N	2	2026-03-20 04:39:09.922	2026-03-20 04:39:09.922
4	сувинер	\N	2	2026-03-20 04:39:21.48	2026-03-20 04:39:21.48
5	Жимс	\N	3	2026-03-20 04:39:43.114	2026-03-20 04:39:43.114
\.


--
-- TOC entry 4034 (class 0 OID 33687)
-- Dependencies: 236
-- Data for Name: AdminType; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminType" (id, name, description, created_at, updated_at, has_duration) FROM stdin;
2	бэлэн бараа	дэлгүүр дээр бэлэн зарагдаж байгаа бараа	2026-03-20 03:55:56.006	2026-03-20 03:55:56.006	f
3	Лайвын бараа	лайваас захиалга авах бараа	2026-03-20 03:56:34.456	2026-03-26 03:12:33.384	t
1	Захиалгын бараа	10-14 хоногт захиалгаар ирэх бараа	2026-03-20 03:55:27.216	2026-03-26 03:16:12.399	t
\.


--
-- TOC entry 4030 (class 0 OID 33667)
-- Dependencies: 232
-- Data for Name: AdminUnit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminUnit" (id, name, description, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4017 (class 0 OID 32968)
-- Dependencies: 219
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Category" (id, name, slug, "parentId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 4020 (class 0 OID 32996)
-- Dependencies: 222
-- Data for Name: LiveItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LiveItem" (id, "liveSessionId", "productId", "livePrice", "availableQty") FROM stdin;
\.


--
-- TOC entry 4019 (class 0 OID 32987)
-- Dependencies: 221
-- Data for Name: LiveSession; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LiveSession" (id, title, "startsAt", "endsAt", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 4021 (class 0 OID 33003)
-- Dependencies: 223
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Order" (id, "userId", status, "orderType", total, currency, note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 4022 (class 0 OID 33013)
-- Dependencies: 224
-- Data for Name: OrderItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OrderItem" (id, "orderId", "productId", qty, "unitPrice") FROM stdin;
\.


--
-- TOC entry 4018 (class 0 OID 32976)
-- Dependencies: 220
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Product" (id, name, slug, description, price, "salePrice", currency, type, status, sku, "stockQty", "thumbnailUrl", images, "categoryId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 4016 (class 0 OID 32959)
-- Dependencies: 218
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, name, email, phone, role, "createdAt", "updatedAt", "passwordHash") FROM stdin;
cmmt0lvwl000014noe5g2meqc	\N	\N	99095413	CUSTOMER	2026-03-16 10:02:41.733	2026-03-16 10:02:41.733	$2a$10$Oy8Tb6RYupi0HIx5fpUMJ.Jgn/ykq8QwkF965t3vk227fUJ1VYqOq
\.


--
-- TOC entry 4015 (class 0 OID 32906)
-- Dependencies: 217
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
16c3df60-b865-41ce-b7d6-c90d3413b5b0	16de81ffae90f821df7039a3d2578c617dde158ca0cec2b8de3b44f395f6ed41	2026-03-15 20:23:56.838842+08	20260315122356_init	\N	\N	2026-03-15 20:23:56.820777+08	1
e7210a81-2d82-49ef-be3f-8be4912e1866	5c5519e4676e846f554236a761b953bbddee2db44bcd17df6dd17641c7dbd598	2026-03-16 01:28:39.331794+08	20260315172839_init	\N	\N	2026-03-16 01:28:39.307638+08	1
a38cb260-bdb7-460a-81e9-b839c9de9835	db248af3aa6306bf96487810b900a89b6b0e44cde748970088e947f08ff7933d	2026-03-20 21:11:56.637926+08	20260320131156_add_user_orders	\N	\N	2026-03-20 21:11:56.635547+08	1
0acbbe6e-efa2-4b3a-83e2-3e68e9272c34	a980cda8b70f13c4fad58c2485381a3dd1331dfbb27e2c60084b4554658204aa	2026-03-26 13:53:20.499011+08	20260326121500_add_admin_promo	\N	\N	2026-03-26 13:53:20.491148+08	1
078fc951-653c-463b-b9ff-f5524f1b29dd	ececd9e7883c6cfacc883b0474472c76a67799b81ed26242f8d8b2c6f1f347b7	2026-03-26 14:50:11.237877+08	20260326133000_add_order_item_status	\N	\N	2026-03-26 14:50:11.236002+08	1
\.


--
-- TOC entry 4067 (class 0 OID 0)
-- Dependencies: 237
-- Name: AdminBanner_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AdminBanner_id_seq"', 2, true);


--
-- TOC entry 4068 (class 0 OID 0)
-- Dependencies: 229
-- Name: AdminBrand_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AdminBrand_id_seq"', 1, false);


--
-- TOC entry 4069 (class 0 OID 0)
-- Dependencies: 225
-- Name: AdminCategory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AdminCategory_id_seq"', 4, true);


--
-- TOC entry 4070 (class 0 OID 0)
-- Dependencies: 247
-- Name: AdminOrderItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AdminOrderItem_id_seq"', 3, true);


--
-- TOC entry 4071 (class 0 OID 0)
-- Dependencies: 245
-- Name: AdminOrder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AdminOrder_id_seq"', 2, true);


--
-- TOC entry 4072 (class 0 OID 0)
-- Dependencies: 241
-- Name: AdminProductImage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AdminProductImage_id_seq"', 14, true);


--
-- TOC entry 4073 (class 0 OID 0)
-- Dependencies: 243
-- Name: AdminProductVariant_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AdminProductVariant_id_seq"', 2, true);


--
-- TOC entry 4074 (class 0 OID 0)
-- Dependencies: 239
-- Name: AdminProduct_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AdminProduct_id_seq"', 6, true);


--
-- TOC entry 4075 (class 0 OID 0)
-- Dependencies: 249
-- Name: AdminPromo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AdminPromo_id_seq"', 1, false);


--
-- TOC entry 4076 (class 0 OID 0)
-- Dependencies: 233
-- Name: AdminStatus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AdminStatus_id_seq"', 4, true);


--
-- TOC entry 4077 (class 0 OID 0)
-- Dependencies: 227
-- Name: AdminSubCategory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AdminSubCategory_id_seq"', 5, true);


--
-- TOC entry 4078 (class 0 OID 0)
-- Dependencies: 235
-- Name: AdminType_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AdminType_id_seq"', 3, true);


--
-- TOC entry 4079 (class 0 OID 0)
-- Dependencies: 231
-- Name: AdminUnit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AdminUnit_id_seq"', 1, false);


--
-- TOC entry 3839 (class 2606 OID 33705)
-- Name: AdminBanner AdminBanner_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminBanner"
    ADD CONSTRAINT "AdminBanner_pkey" PRIMARY KEY (id);


--
-- TOC entry 3831 (class 2606 OID 33665)
-- Name: AdminBrand AdminBrand_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminBrand"
    ADD CONSTRAINT "AdminBrand_pkey" PRIMARY KEY (id);


--
-- TOC entry 3827 (class 2606 OID 33645)
-- Name: AdminCategory AdminCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminCategory"
    ADD CONSTRAINT "AdminCategory_pkey" PRIMARY KEY (id);


--
-- TOC entry 3849 (class 2606 OID 33756)
-- Name: AdminOrderItem AdminOrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminOrderItem"
    ADD CONSTRAINT "AdminOrderItem_pkey" PRIMARY KEY (id);


--
-- TOC entry 3847 (class 2606 OID 33747)
-- Name: AdminOrder AdminOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminOrder"
    ADD CONSTRAINT "AdminOrder_pkey" PRIMARY KEY (id);


--
-- TOC entry 3843 (class 2606 OID 33725)
-- Name: AdminProductImage AdminProductImage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProductImage"
    ADD CONSTRAINT "AdminProductImage_pkey" PRIMARY KEY (id);


--
-- TOC entry 3845 (class 2606 OID 33735)
-- Name: AdminProductVariant AdminProductVariant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProductVariant"
    ADD CONSTRAINT "AdminProductVariant_pkey" PRIMARY KEY (id);


--
-- TOC entry 3841 (class 2606 OID 33715)
-- Name: AdminProduct AdminProduct_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProduct"
    ADD CONSTRAINT "AdminProduct_pkey" PRIMARY KEY (id);


--
-- TOC entry 3851 (class 2606 OID 41754)
-- Name: AdminPromo AdminPromo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminPromo"
    ADD CONSTRAINT "AdminPromo_pkey" PRIMARY KEY (id);


--
-- TOC entry 3835 (class 2606 OID 33685)
-- Name: AdminStatus AdminStatus_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminStatus"
    ADD CONSTRAINT "AdminStatus_pkey" PRIMARY KEY (id);


--
-- TOC entry 3829 (class 2606 OID 33655)
-- Name: AdminSubCategory AdminSubCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminSubCategory"
    ADD CONSTRAINT "AdminSubCategory_pkey" PRIMARY KEY (id);


--
-- TOC entry 3837 (class 2606 OID 33695)
-- Name: AdminType AdminType_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminType"
    ADD CONSTRAINT "AdminType_pkey" PRIMARY KEY (id);


--
-- TOC entry 3833 (class 2606 OID 33675)
-- Name: AdminUnit AdminUnit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminUnit"
    ADD CONSTRAINT "AdminUnit_pkey" PRIMARY KEY (id);


--
-- TOC entry 3813 (class 2606 OID 32975)
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- TOC entry 3821 (class 2606 OID 33002)
-- Name: LiveItem LiveItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LiveItem"
    ADD CONSTRAINT "LiveItem_pkey" PRIMARY KEY (id);


--
-- TOC entry 3819 (class 2606 OID 32995)
-- Name: LiveSession LiveSession_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LiveSession"
    ADD CONSTRAINT "LiveSession_pkey" PRIMARY KEY (id);


--
-- TOC entry 3825 (class 2606 OID 33020)
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- TOC entry 3823 (class 2606 OID 33012)
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- TOC entry 3816 (class 2606 OID 32986)
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- TOC entry 3811 (class 2606 OID 32967)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- TOC entry 3807 (class 2606 OID 32914)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3814 (class 1259 OID 33023)
-- Name: Category_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Category_slug_key" ON public."Category" USING btree (slug);


--
-- TOC entry 3817 (class 1259 OID 33024)
-- Name: Product_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Product_slug_key" ON public."Product" USING btree (slug);


--
-- TOC entry 3808 (class 1259 OID 33021)
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- TOC entry 3809 (class 1259 OID 33022)
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- TOC entry 3869 (class 2606 OID 33807)
-- Name: AdminOrderItem AdminOrderItem_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminOrderItem"
    ADD CONSTRAINT "AdminOrderItem_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public."AdminOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3866 (class 2606 OID 33792)
-- Name: AdminProductImage AdminProductImage_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProductImage"
    ADD CONSTRAINT "AdminProductImage_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public."AdminProduct"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3867 (class 2606 OID 33797)
-- Name: AdminProductImage AdminProductImage_product_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProductImage"
    ADD CONSTRAINT "AdminProductImage_product_variant_id_fkey" FOREIGN KEY (product_variant_id) REFERENCES public."AdminProductVariant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3868 (class 2606 OID 33802)
-- Name: AdminProductVariant AdminProductVariant_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProductVariant"
    ADD CONSTRAINT "AdminProductVariant_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public."AdminProduct"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3860 (class 2606 OID 33772)
-- Name: AdminProduct AdminProduct_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProduct"
    ADD CONSTRAINT "AdminProduct_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES public."AdminBrand"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3861 (class 2606 OID 33762)
-- Name: AdminProduct AdminProduct_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProduct"
    ADD CONSTRAINT "AdminProduct_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public."AdminCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3862 (class 2606 OID 33782)
-- Name: AdminProduct AdminProduct_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProduct"
    ADD CONSTRAINT "AdminProduct_status_id_fkey" FOREIGN KEY (status_id) REFERENCES public."AdminStatus"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3863 (class 2606 OID 33767)
-- Name: AdminProduct AdminProduct_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProduct"
    ADD CONSTRAINT "AdminProduct_subcategory_id_fkey" FOREIGN KEY (subcategory_id) REFERENCES public."AdminSubCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3864 (class 2606 OID 33787)
-- Name: AdminProduct AdminProduct_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProduct"
    ADD CONSTRAINT "AdminProduct_type_id_fkey" FOREIGN KEY (type_id) REFERENCES public."AdminType"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3865 (class 2606 OID 33777)
-- Name: AdminProduct AdminProduct_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminProduct"
    ADD CONSTRAINT "AdminProduct_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES public."AdminUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3859 (class 2606 OID 33757)
-- Name: AdminSubCategory AdminSubCategory_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminSubCategory"
    ADD CONSTRAINT "AdminSubCategory_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public."AdminCategory"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3852 (class 2606 OID 33025)
-- Name: Category Category_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3854 (class 2606 OID 33035)
-- Name: LiveItem LiveItem_liveSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LiveItem"
    ADD CONSTRAINT "LiveItem_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES public."LiveSession"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3855 (class 2606 OID 33040)
-- Name: LiveItem LiveItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LiveItem"
    ADD CONSTRAINT "LiveItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3857 (class 2606 OID 33050)
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3858 (class 2606 OID 33055)
-- Name: OrderItem OrderItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3856 (class 2606 OID 33045)
-- Name: Order Order_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3853 (class 2606 OID 33030)
-- Name: Product Product_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


-- Completed on 2026-03-26 15:56:30 +08

--
-- PostgreSQL database dump complete
--

