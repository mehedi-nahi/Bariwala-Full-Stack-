import { Link } from "react-router-dom";
import { myOrdersAPI } from "../../api/marketplaceAPI";
import { fmtDate, money, plural } from "../../utils/format";
import useAsync from "../../hooks/useAsync";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "../../components/ui";
import Icon from "../../components/Icon";

const MyOrders = () => {
    useDocumentTitle("My orders");
    const { data, loading, error, reload } = useAsync(() => myOrdersAPI().then(r => r.data.data || []), []);
    const orders = data || [];
    const total = orders.reduce((s, o) => s + (o.price || 0), 0);

    return (
        <div className="container page">
            <PageHeader
                title="My orders" subtitle={orders.length ? `${plural(orders.length, "item")} bought · ${money(total)} in total` : "Items you've bought on the marketplace."}
                actions={<Link to="/marketplace/items" className="btn btn-primary"><Icon name="bag" size={16} /> Keep shopping</Link>}
            />

            {loading && !data && <TableSkeleton rows={3} />}
            {error && !data && <ErrorState message={error} onRetry={reload} />}

            {data && (orders.length === 0 ? (
                <EmptyState icon="package" title="No orders yet" action={<Link to="/marketplace/items" className="btn btn-primary">Browse the marketplace</Link>}>
                    When you check out, your purchases show up here with their delivery details.
                </EmptyState>
            ) : (
                <div className="stack stack-md">
                    {orders.map(o => (
                        <article key={o._id} className="card manage-row">
                            <Link to={`/marketplace/item/${o._id}`} className="manage-thumb" aria-label={`View ${o.title}`}>
                                {o.images?.[0] ? <img src={o.images[0]} alt="" loading="lazy" /> : <Icon name="package" size={24} />}
                            </Link>
                            <div style={{ minWidth: 0 }}>
                                <div className="row-wrap" style={{ gap: "0.5rem" }}><strong className="truncate">{o.title}</strong><span className="badge badge-success badge-dot">Paid</span></div>
                                <div className="small muted">Seller: {o.sellerInfo?.[0]?.name || "—"} · Ordered {fmtDate(o.soldAt)}</div>
                                <div className="small muted">Deliver to: {[o.buyerInfo?.addressLine, o.buyerInfo?.area, o.buyerInfo?.city].filter(Boolean).join(", ") || "—"}</div>
                                {o.buyerInfo?.txnRef && <div className="xs muted">Ref <span className="mono">{o.buyerInfo.txnRef}</span></div>}
                            </div>
                            <div className="strong" style={{ fontSize: "1.1rem" }}>{money(o.price)}</div>
                        </article>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default MyOrders;
