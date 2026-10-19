import { Link, useParams } from "react-router-dom";
import { motion, useScroll, useSpring } from "motion/react";
import { POSTS, postBySlug } from "../../content/blog";
import { fmtDate } from "../../utils/format";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { EmptyState } from "../../components/ui";
import { Reveal } from "../../components/motion";
import BlogCard from "../../components/BlogCard";
import Icon from "../../components/Icon";

const BlogPost = () => {
    const { slug } = useParams();
    const post = postBySlug(slug);
    useDocumentTitle(post?.title || "Article not found");
    // reading-progress bar at the top of the page
    const { scrollYProgress } = useScroll();
    const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });

    if (!post) {
        return (
            <div className="container page">
                <EmptyState icon="book" title="Article not found" action={<Link to="/blog" className="btn btn-primary">See all articles</Link>}>
                    It may have been moved or renamed.
                </EmptyState>
            </div>
        );
    }

    const more = POSTS.filter(p => p.slug !== post.slug).slice(0, 2);

    return (
        <>
            <motion.div className="read-progress" style={{ scaleX: progress }} aria-hidden="true" />
            <header className="post-hero" style={{ "--c1": post.tone[0], "--c2": post.tone[1] }}>
                <div className="container container-narrow">
                    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/blog">Blog</Link><span className="sep">/</span><span>{post.category}</span></nav>
                    <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>{post.title}</motion.h1>
                    <motion.p className="post-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                        Bariwala team · {fmtDate(post.date, { day: "numeric", month: "long", year: "numeric" })} · {post.readMins} min read
                    </motion.p>
                </div>
            </header>

            <article className="container container-narrow page post-body">
                <p className="post-lead">{post.excerpt}</p>
                {post.body.map((b, i) => (
                    <Reveal key={i} y={10}>
                        {b.h && <h2>{b.h}</h2>}
                        {b.p && <p>{b.p}</p>}
                        {b.ul && <ul>{b.ul.map(li => <li key={li}><Icon name="check" size={16} /> <span>{li}</span></li>)}</ul>}
                        {b.tip && <div className="alert alert-info"><Icon name="info" size={18} /><div>{b.tip}</div></div>}
                    </Reveal>
                ))}

                <div className="card card-pad post-cta">
                    <div>
                        <strong>Ready to put this into practice?</strong>
                        <p className="small muted">Browse homes or list your own in a couple of minutes.</p>
                    </div>
                    <div className="row-wrap">
                        <Link to="/" className="btn btn-primary">Browse homes</Link>
                        <Link to="/marketplace/items" className="btn btn-secondary">Marketplace</Link>
                    </div>
                </div>

                <h2 className="mt-4 mb-2">Keep reading</h2>
                <div className="grid grid-2">{more.map(p => <BlogCard key={p.slug} post={p} />)}</div>
            </article>
        </>
    );
};

export default BlogPost;
