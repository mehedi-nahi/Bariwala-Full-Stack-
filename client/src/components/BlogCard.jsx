import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { fmtDate } from "../utils/format";
import Icon from "./Icon";

const BlogCard = ({ post }) => (
    <motion.article className="blog-card card" whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
        <Link to={`/blog/${post.slug}`} className="blog-card-link" aria-label={post.title}>
            <div className="blog-cover" style={{ "--c1": post.tone[0], "--c2": post.tone[1] }}>
                <span className="blog-cover-icon"><Icon name={post.icon} size={30} /></span>
                <span className="badge blog-cat">{post.category}</span>
            </div>
            <div className="blog-body">
                <div className="xs muted">{fmtDate(post.date)} · {post.readMins} min read</div>
                <h3>{post.title}</h3>
                <p className="small muted clamp-2">{post.excerpt}</p>
                <span className="blog-more">Read article <Icon name="arrow-right" size={14} /></span>
            </div>
        </Link>
    </motion.article>
);

export default BlogCard;
