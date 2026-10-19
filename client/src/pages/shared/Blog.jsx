import { useState } from "react";
import { POSTS } from "../../content/blog";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { PageHeader } from "../../components/ui";
import { Stagger, StaggerItem } from "../../components/motion";
import BlogCard from "../../components/BlogCard";

const Blog = () => {
    useDocumentTitle("Blog");
    const categories = ["All", ...new Set(POSTS.map(p => p.category))];
    const [cat, setCat] = useState("All");
    const shown = cat === "All" ? POSTS : POSTS.filter(p => p.category === cat);

    return (
        <div className="container page">
            <PageHeader title="The Bariwala blog" subtitle="Practical guides for tenants, landlords and anyone buying or selling around the home." />
            <div className="cat-bar mb-3" role="group" aria-label="Filter articles">
                {categories.map(c => <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
            </div>
            <Stagger key={cat} className="auto-grid" style={{ "--min": "280px" }}>
                {shown.map(p => <StaggerItem key={p.slug}><BlogCard post={p} /></StaggerItem>)}
            </Stagger>
        </div>
    );
};

export default Blog;
