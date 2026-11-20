import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  Play,
  Leaf,
  ScanLine,
  CloudSun,
  Map,
  Menu,
  X,
  Sprout,
  ShieldCheck,
} from "lucide-react";
import { Brand, Demo, Vegetation } from "../components/common";
import { sampleFarms } from "../services/farms.service";
import { useApp } from "../state";
export function Landing() {
  useEffect(() => {
    document.title = "Ankur · Growing with you.";
  }, []);
  const { t, lang, setLang } = useApp();
  const [menu, setMenu] = useState(false);
  return (
    <div className="landing">
      <section className="hero">
        <img
          className="hero-photo"
          src="/photos/harvest.webp"
          alt="Farmer harvesting golden paddy in Bangladesh"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <header className="landing-nav">
          <Brand />
          <nav className={menu ? "open" : ""}>
            <a href="#possibilities" onClick={() => setMenu(false)}>
              {t("The possibilities", "সেবাসমূহ")}
            </a>
            <a href="#how-it-works" onClick={() => setMenu(false)}>
              {t("How it works", "যেভাবে কাজ করে")}
            </a>
            <button onClick={() => setLang(lang === "en" ? "bn" : "en")}>
              {lang === "en" ? "বাংলা" : "English"}
            </button>
          </nav>
          <Link className="btn lime nav-cta" to="/app">
            {t("Explore Ankur", "অঙ্কুর দেখুন")}{" "}
            <ArrowUpRight size={18} />
          </Link>
          <button
            className="mobile-menu"
            aria-label="Toggle menu"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </header>
        <motion.div
          className="hero-content"
          initial={{ opacity: 1, y: 18 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="hero-location">
            <span /> {t("ROOTED IN BANGLADESH", "বাংলাদেশের মাটিতে")}
          </div>
          <h1>
            {t("Smarter farming.", "কৃষি হোক আরও সহজ।")}
            <br />
            <span>{t("Naturally.", "প্রকৃতির সাথে।")}</span>
          </h1>
          <p>
            {t(
              "Understand your crops, anticipate risks, and grow with confidence.",
              "আপনার ফসল বুঝুন, ঝুঁকি জানুন, আর আত্মবিশ্বাসের সাথে এগিয়ে যান।",
            )}
          </p>
          <div className="hero-buttons">
            <Link className="btn lime" to="/app">
              {t("Explore Ankur", "অঙ্কুর দেখুন")}
              <ArrowUpRight size={19} />
            </Link>
            <a className="hero-video" href="#how-it-works">
              <span>
                <Play size={15} />
              </span>
              {t("See how it works", "যেভাবে কাজ করে")}
            </a>
          </div>
        </motion.div>
        <div className="hero-bottom">
          <span>
            {t(
              "Intelligent farming. Grounded in nature.",
              "বুদ্ধিদীপ্ত কৃষি। প্রকৃতির সাথে।",
            )}
          </span>
          <span>23.7° N &nbsp; 90.4° E</span>
        </div>
      </section>
      <div className="intro-strip">
        <span>
          <Sprout />{" "}
          {t(
            "Your land. Your language. Your next step.",
            "আপনার জমি। আপনার ভাষা। আপনার পরবর্তী পদক্ষেপ।",
          )}
        </span>
        <Demo>
          {t(
            "INTERACTIVE CONCEPT • NO LIVE AI",
            "ইন্টারঅ্যাকটিভ ডেমো • বাস্তব AI নয়",
          )}
        </Demo>
      </div>
      <section className="landing-section possibilities" id="possibilities">
        <div className="section-heading">
          <h2>
            {t("A clearer picture.", "আরও স্পষ্ট ধারণা।")}
            <br />
            <span>{t("From leaf to landscape.", "পাতা থেকে পুরো জমি।")}</span>
          </h2>
          <p>
            {t(
              "Good decisions start with understanding. Bring the little details and the bigger picture together, in one simple place.",
              "ভালো সিদ্ধান্তের শুরু সঠিক বোঝাপড়ায়। ছোট বিষয় ও পুরো চিত্র, সব এক জায়গায়।",
            )}
          </p>
        </div>
        <div className="feature-layout">
          <Link to="/app/check" className="feature-photo">
            <img
              src="/photos/leaf.webp"
              alt="Dew on green rice leaves"
              loading="lazy"
            />
            <div>
              <ScanLine />
              <h3>
                {t("A closer look at every leaf.", "প্রতিটি পাতার দিকে নজর।")}
              </h3>
              <p>
                {t(
                  "Check Crop · Upload, explore, understand.",
                  "ফসল যাচাই · ছবি দিন, নমুনা বিশ্লেষণ দেখুন।",
                )}
              </p>
            </div>
            <span className="round-arrow">
              <ArrowUpRight />
            </span>
          </Link>
          <div className="feature-side">
            <Link to="/app/fields" className="feature-field">
              <div className="row between">
                <Map />
                <ArrowUpRight />
              </div>
              <h3>
                {t("Know your field.", "আপনার জমিকে জানুন।")}
                <p>
                  {t(
                    "Keep your plots, observations and field health in view.",
                    "জমি, পর্যবেক্ষণ ও গাছের স্বাস্থ্য একসাথে দেখুন।",
                  )}
                </p>
              </h3>
              <Vegetation farm={sampleFarms()[0]} compact />
            </Link>
            <Link to="/app/climate" className="feature-climate">
              <CloudSun size={42} />
              <div>
                <h3>
                  {t("One step ahead of the sky.", "আবহাওয়ার আগে প্রস্তুতি।")}
                </h3>
                <p>
                  {t(
                    "Explore weather patterns and seasonal risks.",
                    "আবহাওয়ার ধরন ও মৌসুমি ঝুঁকি দেখুন।",
                  )}
                </p>
              </div>
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </section>
      <section className="showcase-section">
        <div className="showcase-copy">
          <h2>
            {t("Your whole farm.", "আপনার পুরো খামার।")}
            <br />
            {t("A little more connected.", "আরও কাছে।")}
          </h2>
          <p>
            {t(
              "A calm place to start the day. See what needs attention, check a crop, and take the next step with a little more clarity.",
              "দিন শুরুর সহজ সঙ্গী। কী নজর দিতে হবে দেখুন, ফসল যাচাই করুন, পরবর্তী পদক্ষেপ নিন।",
            )}
          </p>
          <Link className="text-link" to="/app">
            {t("Step inside your dashboard", "ড্যাশবোর্ড দেখুন")}{" "}
            <ArrowRight size={20} />
          </Link>
        </div>
        <motion.div className="product-preview" whileHover={{ y: -5 }}>
          <div className="preview-bar">
            <Brand />
            <Demo />
          </div>
          <div className="preview-body">
            <h3>{t("Good morning, Rahima.", "সুপ্রভাত, রহিমা।")}</h3>
            <p>
              {t(
                "Let’s make it a good day to grow.",
                "আজকের দিন হোক ফসলের জন্য ভালো।",
              )}
            </p>
            <Vegetation farm={sampleFarms()[0]} compact />
            <Link to="/app" className="preview-open">
              {t("Open interactive demo", "ইন্টারঅ্যাকটিভ ডেমো খুলুন")}{" "}
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </motion.div>
      </section>
      <section className="landing-section how" id="how-it-works">
        <h2>
          {t("Less guesswork.", "অনুমান কম।")}
          <br />
          <span>{t("More growing.", "চাষে মনোযোগ বেশি।")}</span>
        </h2>
        <div className="steps">
          {[
            [
              Map,
              "Make it your field.",
              "Add your crop, location and planting date.",
              "আপনার জমি যোগ করুন।",
              "ফসল, অবস্থান ও রোপণের তারিখ দিন।",
            ],
            [
              ScanLine,
              "Look a little closer.",
              "Explore a crop image check and field observations.",
              "আরও কাছ থেকে দেখুন।",
              "ফসলের ছবি ও জমির পর্যবেক্ষণ দেখুন।",
            ],
            [
              Sprout,
              "Find your next step.",
              "Review sample guidance and ask a farming question.",
              "পরবর্তী পদক্ষেপ জানুন।",
              "নমুনা নির্দেশনা দেখুন, কৃষি প্রশ্ন করুন।",
            ],
          ].map(([Icon, title, desc, bn, bdesc], i) => {
            const I = Icon as typeof Map;
            return (
              <div className="step" key={i}>
                <span className="step-number">0{i + 1}</span>
                <I size={26} />
                <h3>{t(String(title), String(bn))}</h3>
                <p>{t(String(desc), String(bdesc))}</p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="closing">
        <img
          src="/photos/field.webp"
          alt="Lush green paddy field in Bangladesh"
          loading="lazy"
        />
        <div>
          <Leaf size={34} />
          <h2>
            {t("A better tomorrow", "আগামীর ভালো দিন")}
            <br />
            {t("starts in your field.", "শুরু আপনার জমিতে।")}
          </h2>
          <Link className="btn lime" to="/app">
            {t("Explore Ankur", "অঙ্কুর দেখুন")}{" "}
            <ArrowUpRight size={19} />
          </Link>
        </div>
      </section>
      <footer className="landing-footer">
        <div className="row between">
          <Brand />
          <span>
            {t("Growing with you.", "আপনার সাথে বেড়ে উঠছে।")}
          </span>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Ankur · Growing with you.</span>
          <a href="/photos/credits.html" target="_blank" rel="noreferrer">
            Photography & licenses ↗
          </a>
          <span>{t("Built for Bangladesh", "বাংলাদেশের জন্য তৈরি")}</span>
        </div>
      </footer>
    </div>
  );
}
