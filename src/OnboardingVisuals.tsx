import { ArrowDown, BookOpen, Heart, Leaf, Wind } from "lucide-react";
import "./onboarding.css";

export const studyCitation = {
  authors: "薛晶晶、胡琰茹、温柔",
  title: "舞蹈专业大学生进食态度、进食行为与身体成分的相关关系研究",
  journal: "《青少年体育》2025年第10期，41–44、81页；表2见第43页",
  url: "https://doi.org/10.26944/j.cnki.CN10-1081/G8.2025.10.009",
};

export function TermGuide() {
  return (
    <section className="term-guide" aria-label="催吐与应用用词的对应图示">
      <div className="term-guide-caption">
        <Leaf size={14} /> 同一段经历，换一种容易开口的说法
      </div>
      <div className="term-pair">
        <article className="term-card">
          <span className="term-icon">
            <Wind size={27} />
          </span>
          <h2>想要催吐</h2>
          <p>
            有催吐的念头，
            <br />
            还没有发生。
          </p>
          <ArrowDown className="term-arrow" size={20} aria-hidden="true" />
          <div className="term-alias">
            <small>在安屿里</small>
            <strong>「冲动来了」</strong>
          </div>
        </article>
        <article className="term-card peach">
          <span className="term-icon">
            <Heart size={27} />
          </span>
          <h2>已经催吐</h2>
          <p>
            已经发生了
            <br />
            自行诱发呕吐。
          </p>
          <ArrowDown className="term-arrow" size={20} aria-hidden="true" />
          <div className="term-alias">
            <small>在安屿里</small>
            <strong>「经历了风浪」</strong>
          </div>
        </article>
      </div>
      <p className="term-footnote">
        两个入口分别记录“想要发生”和“已经发生”。
        <br />
        这些称呼只是为了更容易开口，你也可以在设置中切换回直接用词。
      </p>
    </section>
  );
}

function Person({ group }: { group: string }) {
  return (
    <svg
      className={"study-person " + group}
      viewBox="0 0 16 27"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="8" cy="4.5" r="3.3" />
      <path d="M5 9.5h6c1.9 0 3 1.6 3 3.5v5a1.3 1.3 0 0 1-2.6 0v-4.5h-.2v11.2a1.3 1.3 0 0 1-2.6 0v-6H7.4v6a1.3 1.3 0 0 1-2.6 0V13.5h-.2V18A1.3 1.3 0 0 1 2 18v-5c0-1.9 1.1-3.5 3-3.5Z" />
    </svg>
  );
}

export function DanceStudyCard({ onDetails }: { onDetails: () => void }) {
  return (
    <section
      className="dance-study"
      aria-label="北京舞蹈学院研究的进食态度筛查结果"
    >
      <div className="study-header">
        <span className="study-book">
          <BookOpen size={18} />
        </span>
        <div>
          <strong>一项来自北京舞蹈学院的调查</strong>
          <small>2025年发表 · 共80名学生，57名女生、23名男生</small>
        </div>
      </div>
      <div className="study-sample">
        <span>
          看见研究中的 <b>57名女生</b>
        </span>
        <small>每个小人代表1名受访者</small>
      </div>
      <div
        className="study-people"
        role="img"
        aria-label="57名女生的筛查分组：16名得分0至10，24名得分11至19，17名得分20及以上"
      >
        {Array.from({ length: 57 }, (_, i) => (
          <Person
            group={i < 16 ? "calm" : i < 40 ? "lilac" : "peach"}
            key={i}
          />
        ))}
      </div>
      <div className="study-legend">
        <span>
          <i className="calm" />
          0–10分：16人
        </span>
        <span>
          <i className="lilac" />
          11–19分：24人
        </span>
        <span>
          <i className="peach" />
          ≥20分：17人
        </span>
      </div>
      <div className="study-metrics">
        <article className="study-metric lilac">
          <span className="study-metric-icon">☁️</span>
          <strong>
            42.1<small>%</small>
          </strong>
          <h2>24人 · 11–19分</h2>
          <p>
            研究中的
            <br />
            “进食障碍症状”分组
          </p>
        </article>
        <article className="study-metric peach">
          <span className="study-metric-icon">🌷</span>
          <strong>
            29.8<small>%</small>
          </strong>
          <h2>17人 · ≥20分</h2>
          <p>
            达到研究所划定的
            <br />
            “可能厌食症或贪食症”分组
          </p>
        </article>
      </div>
      <p className="study-kind-note">
        <Heart size={14} />{" "}
        这些数字提醒我们：进食困扰值得被看见，也值得获得支持。
      </p>
      <p className="study-limit">
        这是进食态度问卷（EAT-26）的筛查分组，
        <strong>不是确诊人数，也不是催吐发生率</strong>
        。单校样本不能代表所有舞蹈生；所有性别的困扰都值得关注。
      </p>
      <div className="study-source">
        <span>来源：{studyCitation.authors}（2025）</span>
        <a href={studyCitation.url} target="_blank" rel="noreferrer">
          《{studyCitation.title}》↗
        </a>
        <small>{studyCitation.journal}</small>
        <button className="text-button" onClick={onDetails}>
          研究详情与适用范围 →
        </button>
      </div>
    </section>
  );
}
