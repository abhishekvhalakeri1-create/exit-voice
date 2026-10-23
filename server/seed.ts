import { db, runInTransaction } from './db';
import { buildExcerpt, computeReadingTime, hashPassword, slugify } from './security';

function isoDaysAgo(days: number, hourOffset = 0): string {
  const base = new Date('2026-10-23T15:30:00Z').getTime();
  return new Date(base - days * 86_400_000 - hourOffset * 3_600_000).toISOString();
}

export function ensureSeedData(): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existing.count > 0) return;

  const sharedHash = hashPassword('ExitVoice2026!');

  runInTransaction(() => {
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, email, password_hash, display_name, role_headline, bio, role,
        email_verified, default_anonymous, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const users = [
      {
        id: 'usr_mod',
        email: 'mod@exitvoice.local',
        handle: 'editorial_desk',
        headline: 'ExitVoice Community Moderator',
        bio: 'Reviewing submissions for redaction safety, no-doxxing compliance, and constructive context.',
        role: 'moderator',
        anon: 0,
        days: 120,
      },
      {
        id: 'usr_maya',
        email: 'maya@exitvoice.local',
        handle: 'maya_lin',
        headline: 'Former Senior Audit Associate',
        bio: 'Four busy seasons in public accounting before moving to corporate FP&A. Big believer in keeping your own paper trail.',
        role: 'member',
        anon: 0,
        days: 84,
      },
      {
        id: 'usr_derrick',
        email: 'derrick@exitvoice.local',
        handle: 'derrick_oh',
        headline: 'Night-Shift Freight Operations',
        bio: 'Twelve years running dock doors and linehaul schedules across the Midwest.',
        role: 'member',
        anon: 0,
        days: 75,
      },
      {
        id: 'usr_samir',
        email: 'samir@exitvoice.local',
        handle: 'samir_infra',
        headline: 'Platform Engineer',
        bio: 'Infrastructure, on-call survivor, hobbyist woodworker.',
        role: 'member',
        anon: 0,
        days: 68,
      },
      {
        id: 'usr_hannah',
        email: 'hannah@exitvoice.local',
        handle: 'rn_stepdown',
        headline: 'Step-Down Unit RN',
        bio: 'Bedside nursing for six years before switching to outpatient infusion.',
        role: 'member',
        anon: 1,
        days: 60,
      },
      {
        id: 'usr_trevor',
        email: 'trevor@exitvoice.local',
        handle: 'trev_builds',
        headline: 'Apprentice Electrician (ex-Retail Ops)',
        bio: 'Traded regional retail spreadsheets for conduit benders at 34.',
        role: 'member',
        anon: 0,
        days: 52,
      },
      {
        id: 'usr_claire',
        email: 'claire@exitvoice.local',
        handle: 'hr_from_inside',
        headline: 'People Operations Partner',
        bio: 'Trying to give honest answers on how severance, COBRA, and headcount freezes actually work behind the curtain.',
        role: 'member',
        anon: 0,
        days: 49,
      },
      {
        id: 'usr_nate',
        email: 'nate@exitvoice.local',
        handle: 'nate_k',
        headline: 'Former Engineering Manager',
        bio: 'Back to writing code happily after two humbling years in middle management.',
        role: 'member',
        anon: 0,
        days: 40,
      },
      {
        id: 'usr_priya',
        email: 'priya@exitvoice.local',
        handle: 'priya_ux',
        headline: 'Staff Product Designer',
        bio: 'B2B tools, design systems, startup wind-downs.',
        role: 'member',
        anon: 0,
        days: 33,
      },
      {
        id: 'usr_luis',
        email: 'luis@exitvoice.local',
        handle: 'luis_ops',
        headline: 'Supply Chain Planner',
        bio: 'Demand planning and ERP migrations.',
        role: 'member',
        anon: 1,
        days: 28,
      },
    ];

    for (const u of users) {
      const ts = isoDaysAgo(u.days);
      insertUser.run(
        u.id,
        u.email,
        sharedHash,
        u.handle,
        u.headline,
        u.bio,
        u.role,
        1,
        u.anon,
        ts,
        ts
      );
    }

    // Personalized interests for Maya (demo member account)
    const insertInterest = db.prepare(
      'INSERT INTO user_interests (user_id, topic_type, topic_value) VALUES (?, ?, ?)'
    );
    insertInterest.run('usr_maya', 'category', 'Layoff');
    insertInterest.run('usr_maya', 'category', 'Resignation');
    insertInterest.run('usr_maya', 'category', 'Management issues');
    insertInterest.run('usr_maya', 'category', 'Positive exit');
    insertInterest.run('usr_maya', 'industry', 'Financial Services & Accounting');
    insertInterest.run('usr_maya', 'industry', 'Technology & Software');

    // Companies
    const insertCompany = db.prepare(`
      INSERT INTO companies (id, name, slug, industry, headquarters, size_range, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const companies = [
      {
        id: 'cmp_northstar',
        name: 'Northstar Freight Systems',
        industry: 'Logistics, Supply Chain & Warehousing',
        hq: 'Columbus, OH',
        size: '1,000–5,000 employees',
      },
      {
        id: 'cmp_kestrel',
        name: 'Kestrel Cloud',
        industry: 'Technology & Software',
        hq: 'Austin, TX',
        size: '250–1,000 employees',
      },
      {
        id: 'cmp_alderbrook',
        name: 'Alderbrook Advisory LLP',
        industry: 'Financial Services & Accounting',
        hq: 'Chicago, IL',
        size: '500–1,000 employees',
      },
      {
        id: 'cmp_vanguard_health',
        name: ' St. Jude Valley Medical Center',
        industry: 'Healthcare & Clinical',
        hq: 'Pittsburgh, PA',
        size: '5,000+ employees',
      },
      {
        id: 'cmp_hearthstone',
        name: 'Harborlight Data',
        industry: 'Technology & Software',
        hq: 'Boston, MA',
        size: '50–250 employees',
      },
      {
        id: 'cmp_bramble',
        name: 'Bramble Home Goods',
        industry: 'Retail, Food & Hospitality',
        hq: 'Minneapolis, MN',
        size: '1,000–5,000 employees',
      },
      {
        id: 'cmp_solstice',
        name: 'Solstice Creative Group',
        industry: 'Media, Design & Publishing',
        hq: 'Brooklyn, NY',
        size: '50–250 employees',
      },
    ];

    for (const c of companies) {
      const cleanName = c.name.trim();
      insertCompany.run(
        c.id,
        cleanName,
        slugify(cleanName),
        c.industry,
        c.hq,
        c.size,
        isoDaysAgo(90)
      );
    }

    // Stories
    const insertStory = db.prepare(`
      INSERT INTO stories (
        id, slug, author_id, title, content, excerpt, category, industry,
        employment_type, company_id, company_descriptor, experience_type, duration,
        key_lesson, evidence_note, identity_preference, author_role_context,
        status, moderation_flag, moderation_note, reviewed_by, reading_time_minutes,
        created_at, updated_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedStories = [
      {
        id: 'sty_01',
        authorId: 'usr_samir',
        title: 'Six weeks after "no layoffs planned," half of platform engineering lost Slack mid-sentence',
        content: `When a private equity firm bought a majority stake in Kestrel Cloud back in July, our CEO held an all-hands specifically to calm people down. Somebody on Slido asked straight up whether redundant engineering teams should expect cuts before year-end. His exact words were: "We bought Kestrel to grow the product, not strip it for parts. Nobody's seat is going anywhere."

Six weeks to the day after that call, I woke up to an 8:45 AM invite titled "Org Update" with a VP I'd spoken to twice and an HR business partner blind-copied. No agenda. Calendar blocked for fifteen minutes.

If you've never been through one of these, the surreal part isn't even the call itself — it's how scripted and clinical it feels next to four years of late-night incident bridges with real human beings. The VP read three paragraphs off another monitor without looking at the camera, thanked me for my contributions, and muted himself while HR walked through packet logistics.

Halfway through writing a thank-you DM to a junior engineer I'd helped hire in April, Okta killed my session. Screen just went white and kicked me to a login box.

> What bothered me wasn't that the business cut costs — software margins tightened everywhere. It was looking parents with new mortgages in the eye six weeks earlier and telling them not to interview elsewhere when the spreadsheet was already locked.

Two practical things saved me real money over the next week:
- Two months earlier, a friend warned me to forward copies of my equity grant docs, last four pay stubs, and written performance reviews to a personal folder. Once Workday access disappears, getting historical PDFs from a swamped HR inbox takes forever.
- Our initial severance agreement had a broad non-disparagement clause AND a weirdly worded customer non-solicit that practically covered half the B2B SaaS market. Three of us split an hour with an employment attorney ($400 total) and asked politely for narrower language plus one extra month of COBRA coverage. They said no on base cash, yes on COBRA.

I landed somewhere smaller last month. I still like the people I built things with at Kestrel, and I hold zero grudge against middle managers who found out ten minutes before we did. Just stop telling employees "nothing is changing" when lawyers are already drafting separation packets.`,
        category: 'Layoff',
        industry: 'Technology & Software',
        employmentType: 'Full-time',
        companyId: 'cmp_kestrel',
        companyDescriptor: null,
        experienceType: 'Involuntary exit',
        duration: '2–5 years',
        keyLesson: 'Keep personal copies of pay stubs, equity agreements, and performance reviews BEFORE any acquisition closes — and remember COBRA months are often easier for HR to approve than extra base severance.',
        evidenceNote: 'Verified separation packet timeline header (redacted).',
        identityPreference: 'display_name',
        roleContext: 'Former Staff Platform Engineer',
        status: 'published',
        modFlag: 'standard',
        daysAgo: 3,
      },
      {
        id: 'sty_02',
        authorId: 'usr_derrick',
        title: 'When corporate shut down our Columbus terminal, our regional director quietly fought for every hourly loader',
        content: `Most terminal closure stories end with locks on the gate and security guards handing out cardboard boxes. Ours almost went down like that, except one regional director basically spent the last political capital of his career making sure third-shift dock workers didn't get stiffed.

Northstar consolidated two Ohio cross-dock terminals into a newer automated hub forty miles west. On paper, corporate offered everybody "transfer opportunities," which sounded generous in the press release because that meant they didn't have to pay severance if you declined.

Except anybody who actually worked third shift knew half our crew shared one car per household or relied on county bus routes that didn't go anywhere near the new industrial park at 11:30 PM. Driving 85 round-trip winter miles on $21.50 an hour wasn't a real transfer — it was a polite way to force resignations and dodge unemployment claims.

Our terminal director — guy who started loading trailers in the nineties — didn't do motivational speeches. Instead, he documented exact commute distances, shift overlap conflicts, and forklift certification records for thirty-eight hourly employees and sent a formal memo up to legal and operations arguing that calling a 47-mile unserviced shift change "comparable employment" was going to blow up in state unemployment hearings anyway.

Corporate caved halfway: anyone living more than 30 miles from the new hub got four weeks of severance plus payout of accrued PTO and clean unemployment eligibility. He also invited two competing regional carriers to set up folding tables at the VFW hall down the road on a Thursday afternoon. Nineteen guys had conditional job offers before our final Friday shift ended.

He took early retirement two months later. Never bragged about it once. If you ever end up in management during a shutdown, you might not stop the closure, but how people land afterward is where your actual character shows.`,
        category: 'Positive exit',
        industry: 'Logistics, Supply Chain & Warehousing',
        employmentType: 'Leadership / Management',
        companyId: 'cmp_northstar',
        companyDescriptor: null,
        experienceType: 'Involuntary exit',
        duration: '10+ years',
        keyLesson: 'Watch out for "relocation or transfer offers" used to avoid paying severance — documenting commute distance and shift changes matters enormously for both severance leverage and state unemployment.',
        evidenceNote: null,
        identityPreference: 'display_name',
        roleContext: 'Night-Shift Freight Supervisor',
        status: 'published',
        modFlag: 'standard',
        daysAgo: 5,
      },
      {
        id: 'sty_03',
        authorId: 'usr_luis',
        title: 'Hired fully remote 600 miles away in 2023. Given 30 days to move to Columbus or "voluntarily resign."',
        content: `Posting anonymously because I'm still waiting on my final state unemployment determination.

Same company that handled warehouse exits decently two years ago brought in a new VP of Supply Chain this spring who decided every salaried planner needed to sit four days a week in Columbus. Half of my six-person planning team had explicit "Remote — US" offer letters signed in 2023 and 2024. Nobody moved away while employed; we lived in different states the day we were hired.

In August we got an email on a Friday afternoon: report to headquarters badge-in by October 1, with a flat $2,500 taxable relocation stipend (which wouldn't break a lease, let alone move a family with kids in school), or HR would process our departure as a "voluntary resignation for refusal of assignment."

Zero severance. No transition runway. Just "we'd love to see you in Ohio."

What stung most was training my replacement — hired locally at $18k less than my salary — during my final two weeks just to make sure I didn't lose my health coverage before month-end. In hindsight, watching job reqs go up in lower-cost brackets right before an RTO mandate tells you everything about what the policy is actually designed to accomplish.

For anyone facing a sudden long-distance RTO mandate right now: check your state's "constructive discharge" rules before signing anything that uses the word *resign*. Do not write a resignation letter. Reply in writing stating clearly: "I am willing and able to continue performing my job duties under my existing remote employment agreement, and I am not resigning." That single sentence was the only reason my unemployment hearing examiner took my claim seriously last week.`,
        category: 'Unfair treatment',
        industry: 'Logistics, Supply Chain & Warehousing',
        employmentType: 'Full-time',
        companyId: 'cmp_northstar',
        companyDescriptor: null,
        experienceType: 'Constructive / forced exit',
        duration: '2–5 years',
        keyLesson: 'Never submit a resignation letter during a long-distance RTO mandate if you were hired remote. State in writing that you remain willing to work under your original terms and are NOT resigning.',
        evidenceNote: 'Redacted offer letter header showing Remote designation + RTO notice date.',
        identityPreference: 'anonymous',
        roleContext: 'Former Supply Chain Planner',
        status: 'published',
        modFlag: 'high_care_review',
        daysAgo: 2,
      },
      {
        id: 'sty_04',
        authorId: 'usr_maya',
        title: 'Wait until the CPA bonus clears your actual checking account — lessons from leaving public accounting cleanly',
        content: `I spent three and a half years in audit at Alderbrook Advisory. If you've worked mid-tier public accounting, you know the deal going in: long winters, fast learning curve, chronically understaffed engagements because two seniors already left in October.

Around month thirty, I realized every conversation with partners followed the exact same loop. Whenever someone burned out after 65-hour weeks from January through April, leadership acted shocked, formed a "Retention & Wellness Committee," bought everyone branded quarter-zips, and then assigned us an extra summer benefit-plan audit two weeks later.

Still, I didn't storm out mid-engagement, and looking back I'm really glad someone older talked me off the ledge in March. Instead, I made a quiet four-month exit plan:
1. Passed my final CPA section first and submitted state licensing paperwork while still on firm-paid Becker study materials.
2. Checked the employee handbook small print on exam bonuses: there was a 90-day clawback clause tied to the payout date, AND bonuses were only paid to employees "in active status not under notice" on payday.
3. Took ten days of actual PTO in June so I wasn't interviewing completely fried.
4. Put in standard two weeks' notice the Tuesday *after* direct deposit hit my bank account — with clean handover workpapers organized for the staff one underneath me who had done nothing wrong.

Funny postscript: eighteen months later, the controller at my current company called one of the audit managers I worked under as a backchannel reference without even asking me first. Because I left clean workpapers behind instead of torching the bridge in April, that manager essentially closed the offer for me.

Protect your own wallet and read every clawback clause twice — just don't confuse outgrowing a grind culture with needing a dramatic exit scene.`,
        category: 'Resignation',
        industry: 'Financial Services & Accounting',
        employmentType: 'Full-time',
        companyId: 'cmp_alderbrook',
        companyDescriptor: null,
        experienceType: 'Voluntary exit',
        duration: '2–5 years',
        keyLesson: 'Read handbook clawback rules on bonuses/tuition before giving notice, wait until funds clear your bank account, and leave clean handover notes for junior teammates — small industries talk constantly.',
        evidenceNote: null,
        identityPreference: 'display_name',
        roleContext: 'Former Senior Audit Associate',
        status: 'published',
        modFlag: 'standard',
        daysAgo: 8,
      },
      {
        id: 'sty_05',
        authorId: 'usr_nate',
        title: 'Honest confession: I was part of a messy management exit, and half the mistakes were mine',
        content: `Most posts in places like this are about terrible bosses, so it felt fair to write one from the seat where I screwed up plenty myself.

Two years ago I was a strong senior backend engineer at a mid-size SaaS company when my director left. Leadership offered me the engineering manager title over my own peer group with a $10k bump and zero training. My ego loved how "Head of Core Services" sounded on LinkedIn, so I said yes immediately without asking what budget authority or hiring headcount actually came with the job.

Turns out the answer was: none. My job quickly became absorbing unrealistic quarterly promises made by sales VPs, failing to push back early enough because I wanted execs to see me as a "team player," and then watching my former friends burn out trying to hit dates I should have rejected in week one.

By year two, I was anxious every Sunday evening, resentful upward, defensive downward, and writing zero code. When a new VP came in this summer, pulled me aside after a rough retro, and said bluntly, "You look miserable and the team needs someone who actually wants to manage full-time," my chest dropped — and ten seconds later I felt the biggest wave of relief I'd felt in eighteen months.

We negotiated a mutual transition: eight weeks to hand off direct reports properly, severance package, and clean references so I could interview strictly for individual contributor staff roles again.

If you're an IC being dangled a "player-coach manager" promotion right now during a hiring freeze, ask hard questions before taking the bait. Responsibility without authority isn't a promotion — it's being hired as a shock absorber.`,
        category: 'Management issues',
        industry: 'Technology & Software',
        employmentType: 'Leadership / Management',
        companyId: null,
        companyDescriptor: 'Unnamed Series C B2B Software Company',
        experienceType: 'Mutual separation',
        duration: '2–5 years',
        keyLesson: 'Before accepting a "player-coach" manager promotion, ask what authority you have to say no to scope. Responsibility without hiring or timeline authority turns good engineers into burned-out shock absorbers.',
        evidenceNote: null,
        identityPreference: 'display_name',
        roleContext: 'Former Engineering Manager (back to IC)',
        status: 'published',
        modFlag: 'standard',
        daysAgo: 11,
      },
      {
        id: 'sty_06',
        authorId: 'usr_hannah',
        title: 'Why six experienced nurses left our step-down floor in four months (hint: pizza wasn’t the issue)',
        content: `Hospital administration loves telling local news about the "national nursing shortage" like nurses evaporated into thin air. None of my unit friends quit nursing. Five of us work outpatient clinics or ambulatory surgery centers within twenty minutes of the exact same hospital right now.

What drove six charge-capable RNs off our telemetry step-down floor at St. Jude Valley between April and August came down to three repeatable choices:

First, safe staffing ratios existed on a laminated recruitment flyer and nowhere else. Taking six high-acuity step-down patients on night shift with one shared tech for twenty-four beds meant you weren't practicing careful nursing anymore — you were triaging which alarm wouldn't kill someone in the next four minutes while praying nobody's heparin drip needed titrating at shift change.

Second, whenever nurses filed unsafe-staffing assignment-despite-objection (ADO) forms, unit leadership treated the person filing the form as an "attitude problem" during annual evaluations rather than fixing float pool coverage.

Third, travelers were brought in at double hourly rates while five-year staff nurses got capped at a 2.5% merit raise — and we were expected to precept them with zero preceptor differential.

I finally put in my notice after catching a near-miss medication error at 5:30 AM on my fourth shift of the week and realizing that if something ever went sideways, the hospital system would hang my license out to dry in ten minutes flat.

My current infusion clinic pays $3/hr less than hospital night differential. I eat lunch sitting down every single day, know my patients' names, and haven't cried in my car once since August.`,
        category: 'Workplace toxicity',
        industry: 'Healthcare & Clinical',
        employmentType: 'Full-time',
        companyId: 'cmp_vanguard_health',
        companyDescriptor: null,
        experienceType: 'Voluntary exit',
        duration: '5–10 years',
        keyLesson: 'Protect your professional license first: when understaffing becomes structural rather than temporary, institutional loyalty will not protect you if an error happens on your shift.',
        evidenceNote: null,
        identityPreference: 'anonymous',
        roleContext: 'Step-Down RN, BSN (6 yrs bedside)',
        status: 'published',
        modFlag: 'high_care_review',
        daysAgo: 6,
      },
      {
        id: 'sty_07',
        authorId: 'usr_priya',
        title: 'Our seed startup ran out of runway — and how our founders handled the last 45 days should be taught in business school',
        content: `Harborlight Data shut down in September after our Series A lead pulled a term sheet late in diligence. Twelve people lost their jobs, mine included, so nobody broke out champagne.

Still, I wanted to post this here because people deserve to see what decent leadership actually looks like when the math stops working.

Instead of pretending everything was fine until payroll bounced, our two founders called the whole company into one room with 65 days of cash still in the bank. They showed the exact runway spreadsheet on screen: cash balance, wind-down legal/tax obligations, customer data export commitments, and employee payroll.

Here is what they actually did over the next six weeks:
- Cut every non-essential software vendor that week so employees got two full months of paid wind-down runway while actively interviewing during work hours.
- Published a public "talent book" spreadsheet where each of the twelve employees wrote three lines about what we wanted next, and both founders personally DM'd forty hiring managers across Boston and NYC doing warm intros — even for junior engineers.
- Voted with the board to let everyone wipe and keep their work MacBooks rather than auctioning used laptops for pennies.
- Paid out health insurance through November 30.

Ten of the twelve of us signed offers before our last payroll date. If either founder starts another company in five years and emails me at midnight, I wouldn't even need to see the pitch deck before saying yes.`,
        category: 'Positive exit',
        industry: 'Technology & Software',
        employmentType: 'Full-time',
        companyId: 'cmp_hearthstone',
        companyDescriptor: null,
        experienceType: 'Involuntary exit',
        duration: '1–2 years',
        keyLesson: 'Transparency when things fail builds lifelong trust. Treating outgoing employees like adults with two months of honest notice costs zero extra ego and buys decades of goodwill.',
        evidenceNote: null,
        identityPreference: 'display_name',
        roleContext: 'Former Founding Product Designer',
        status: 'published',
        modFlag: 'standard',
        daysAgo: 14,
      },
      {
        id: 'sty_08',
        authorId: 'usr_trevor',
        title: 'Left a $78k retail district job at 34 for a $22/hr commercial electrical apprenticeship. Year one math and reality check.',
        content: `Writing this for anyone in their thirties staring at a corporate or retail middle-management ladder wondering if it's crazy to start completely at the bottom of a skilled trade.

I spent nine years at Bramble Home Goods working up from assistant store manager to multi-store operations coordinator. On paper I had a title and $78k salary. In reality, salaried retail management meant working every November–December blacked out from family holidays, answering district group chats at 10 PM about endcap planograms, and realizing regional directors above me looked fifty going on sixty-five.

I didn't rage-quit. My wife and I spent eight months cutting our monthly fixed bills, paying off one car note, and banking six months of gap cash before I accepted an IBEW commercial apprenticeship spot starting around $22/hr.

Real talk that trade influencers skip on TikTok:
- Month one physically wrecked my knees and lower back until I bought proper boots, knee pads, and stretched every night. Carrying bundles of EMT conduit all day when you've spent five years in chinos humbles you fast.
- You will take directions from a 24-year-old journeyman who knows ten times more than you do. Check your ego in the parking lot or don't bother applying.
- Winter jobsites at 6:30 AM before the heat is running are cold. Period.

Why I'd make the trade ten times out of ten anyway: when we roll tools up at 3:15 PM, nobody emails me at home. Ever. Every hour past forty pays real overtime instead of "salaried ownership." My scheduled raises are printed in black and white on a card in my wallet, and within three years I'll pass my old retail salary with full pension and healthcare paid on top rather than deducted from my check.`,
        category: 'Career transition',
        industry: 'Retail, Food & Hospitality',
        employmentType: 'Full-time',
        companyId: 'cmp_bramble',
        companyDescriptor: null,
        experienceType: 'Voluntary exit',
        duration: '5–10 years',
        keyLesson: 'Mid-career pivots work when you prepare for the first-year pay dip mathematically ahead of time and leave title ego behind on day one.',
        evidenceNote: null,
        identityPreference: 'display_name',
        roleContext: 'Ex-Retail Ops Coordinator / 2nd-Year Apprentice',
        status: 'published',
        modFlag: 'standard',
        daysAgo: 17,
      },
      {
        id: 'sty_09',
        authorId: 'usr_claire',
        title: 'Placed on a sudden 30-day PIP twelve days after asking HR about intermittent FMLA leave for a parent',
        content: `Sharing anonymously under general role details so others recognize the pattern quickly instead of doubting their own sanity like I did at first.

Before switching into my current role, I worked three years in client operations at a mid-market agency where I had three straight "Exceeds Expectations" reviews — the most recent one signed just ten weeks before everything flipped.

In early spring my dad had a stroke, and I emailed my director and HR asking how intermittent FMLA paperwork worked so I could take him to Thursday morning physical therapy appointments and make up hours on Fridays.

Twelve days later, my weekly 1:1 turned into a formal 30-day Performance Improvement Plan citing "communication responsiveness" and vague "stakeholder alignment" metrics that had literally no measurable pass criteria — things like *demonstrate proactive executive presence across all workstreams*.

Here is what changed the outcome completely:
1. That night, before IT locked anything down, I printed PDFs of my three signed performance reviews, client commendation emails from the prior month, and the timestamped FMLA inquiry thread.
2. Instead of arguing emotionally in the meeting, I sent a calm written response asking HR to clarify objective, measurable completion criteria and explicitly noting the timeline between my protected FMLA inquiry and the sudden reversal of my recent performance rating.
3. One consultation letter from a local plaintiff-side employment lawyer transformed a "zero severance termination track" into a confidential mutual separation agreement covering five months of pay and neutral verification of employment.

Most PIPs aren't coaching tools; they are paper trails built backwards. Keep your own contemporaneous paper trail first.`,
        category: 'Discrimination',
        industry: 'Consulting & Professional Services',
        employmentType: 'Full-time',
        companyId: null,
        companyDescriptor: 'Mid-size Marketing & Advisory Firm',
        experienceType: 'Involuntary exit',
        duration: '2–5 years',
        keyLesson: 'When an uncharacteristic PIP appears right after requesting protected medical, parental, or family leave, save prior positive reviews immediately and respond calm and factual in writing.',
        evidenceNote: 'Timeline comparison between signed Q4 review and PIP issuance date reviewed by moderator.',
        identityPreference: 'anonymous',
        roleContext: 'Former Client Operations Manager',
        status: 'published',
        modFlag: 'high_care_review',
        daysAgo: 9,
      },
      {
        id: 'sty_10',
        authorId: 'usr_priya',
        title: 'Fourteen months of "full-time conversion next quarter" at Solstice Creative taught me to price contract renewals upward',
        content: `Early in my career I fell for the classic agency carrot at Solstice Creative Group: "Come in on a 90-day W-2 contract so we can bypass the headcount approval delay, and we'll convert you to full-time with benefits in Q2."

Ninety days turned into six months ("waiting on one client retainer signature"), then nine months ("annual budget cycle freezes conversions until January"), then fourteen months — all while working the exact same 45-hour client sprints, attending mandatory Monday culture standups, and getting zero paid holidays when the rest of the studio shut down between Christmas and New Year's.

When they finally put a conversion offer on the table in month fourteen, the base salary worked out to *less* per hour than my contract rate, justified by "total rewards culture."

I thanked them politely, declined conversion, told my creative director my contract renewal rate was going up 22% to cover unpaid holidays and self-funded health insurance, and started interviewing externally that week. Funny enough, they paid the higher rate for two months while scrambling to backfill, which funded my break between jobs before starting a real full-time role elsewhere.

If a company gets full-time output without paying payroll taxes, PTO, or 401(k) match, inertia always favors keeping you right where you are unless staying uncommitted costs them more than converting you.`,
        category: 'Resignation',
        industry: 'Media, Design & Publishing',
        employmentType: 'Contract / Contingent',
        companyId: 'cmp_solstice',
        companyDescriptor: null,
        experienceType: 'Voluntary exit',
        duration: '1–2 years',
        keyLesson: 'Never treat a verbal "contract-to-hire" promise as real compensation. Set a hard calendar deadline in your own head, and raise your renewal rate if conversion slips twice.',
        evidenceNote: null,
        identityPreference: 'anonymous',
        roleContext: 'Contract Senior Designer',
        status: 'published',
        modFlag: 'standard',
        daysAgo: 21,
      },
      // 1 Pending Review Story so Moderator Desk always has a realistic live item ready to inspect & approve!
      {
        id: 'sty_pending_01',
        authorId: 'usr_samir',
        title: 'Terminated without warning during probation after flagging unencrypted customer backups in staging',
        content: `Submitting for review — kept all internal server hostnames and colleague names out.

Joined a small health-adjacent billing vendor this spring after my previous layoff. In week five, while debugging slow test seeds, I realized our staging environment was pulling nightly snapshots of real production tables — complete with unmasked patient billing addresses and DOBs — readable by twenty contractors.

I brought it up privately in Slack to my VP of Engineering first rather than making a scene in a group channel, even offering to write the anonymization script over two days so nobody's sprint slipped. His response was "we've done that for four years, focus on your onboarding ticket."

Because healthcare compliance rules personally terrified me, I followed up once via email summarizing the risk neutrally so it was clear I'd raised it. Four days later on Friday afternoon I was let go for "not matching startup velocity expectations during probation."

Hurts financially right after another layoff earlier this year, though I sleep fine knowing my name isn't on that repo anymore.`,
        category: 'Termination',
        industry: 'Healthcare & Clinical',
        employmentType: 'Full-time',
        companyId: null,
        companyDescriptor: 'Small Healthcare Billing Software Vendor',
        experienceType: 'Involuntary exit',
        duration: 'Under 6 months',
        keyLesson: 'How leadership reacts to quiet, constructive bad news in month one tells you everything about whether your integrity is safe there long term.',
        evidenceNote: 'Redacted termination letter confirming at-will probation release four days after compliance email.',
        identityPreference: 'anonymous',
        roleContext: 'Backend Engineer',
        status: 'pending_review',
        modFlag: 'high_care_review',
        daysAgo: 1,
      },
      // 1 Private Draft belonging to usr_maya so logging in as Maya immediately showcases Draft editing + autosave!
      {
        id: 'sty_draft_maya',
        authorId: 'usr_maya',
        title: 'What I wish fresh grads knew before signing their first "unlimited PTO" offer letter',
        content: `Still jotting notes down on this one before deciding whether to post under my handle or anonymously.\n\nAt my first job out of college, "unlimited flexible time off" sounded way more generous than 15 accrued days. Nobody mentions the two giant catches until you actually leave:\n\n1. Socially, nobody wants to be the person taking more days than the most workaholic manager on the team, so people actually take *less* time off.\n2. Financially, when layoffs or resignations happen, accrued PTO has to be paid out in cash in many states — "unlimited" means your final paycheck payout for unused vacation is $0.00.`,
        category: 'Other',
        industry: 'Financial Services & Accounting',
        employmentType: 'Full-time',
        companyId: null,
        companyDescriptor: '',
        experienceType: 'Voluntary exit',
        duration: '1–2 years',
        keyLesson: 'Unlimited PTO saves employers balance-sheet liability on payout day — ask during interviews how many days the average team member actually took last year.',
        evidenceNote: null,
        identityPreference: 'display_name',
        roleContext: 'Former Senior Audit Associate',
        status: 'draft',
        modFlag: 'standard',
        daysAgo: 0,
      },
    ];

    const storySlugs = new Map<string, string>();
    for (const s of seedStories) {
      const ts = isoDaysAgo(s.daysAgo, 2);
      const slug = `${slugify(s.title)}-${s.id.slice(-4)}`;
      storySlugs.set(s.id, slug);
      insertStory.run(
        s.id,
        slug,
        s.authorId,
        s.title,
        s.content,
        buildExcerpt(s.content),
        s.category,
        s.industry,
        s.employmentType,
        s.companyId,
        s.companyDescriptor,
        s.experienceType,
        s.duration,
        s.keyLesson,
        s.evidenceNote,
        s.identityPreference,
        s.roleContext,
        s.status,
        s.modFlag,
        null,
        s.status === 'published' ? 'usr_mod' : null,
        computeReadingTime(s.content),
        ts,
        ts,
        s.status === 'published' ? ts : null
      );
    }

    // Nested Reddit-like Comments!
    const insertComment = db.prepare(`
      INSERT INTO comments (
        id, story_id, author_id, parent_id, body, is_anonymous, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    const seedComments = [
      // Thread on sty_01 (Kestrel Cloud layoff)
      {
        id: 'cmt_01',
        storyId: 'sty_01',
        authorId: 'usr_claire',
        parentId: null,
        anon: 0,
        hoursAgo: 66,
        body: 'People Ops person here — seconding your point on COBRA vs base cash. Base severance hits a fixed restructuring pool approved by the board, so HR almost never gets approval to bump weeks for one person without recalculating everyone else. Subsidizing extra months of COBRA or extending equipment buyouts often sits in a discretionary bucket we can sign off on in twenty minutes.',
      },
      {
        id: 'cmt_02',
        storyId: 'sty_01',
        authorId: 'usr_samir',
        parentId: 'cmt_01',
        anon: 0,
        hoursAgo: 62,
        body: 'That makes complete sense in hindsight. Our HR partner pushed back immediately on extra weeks, then approved the extra month of health coverage the very next afternoon without escalating.',
      },
      {
        id: 'cmt_03',
        storyId: 'sty_01',
        authorId: 'usr_maya',
        parentId: 'cmt_02',
        anon: 0,
        hoursAgo: 58,
        body: 'Also adding for anyone reading this mid-layoff: download your 401(k) summary plan description and check vesting percentages before signing. One person on a former client was 11 days short of a 3-year cliff and got HR to set their official separation date two weeks out using accrued vacation so they kept $9,400 in match.',
      },
      {
        id: 'cmt_04',
        storyId: 'sty_01',
        authorId: 'usr_nate',
        parentId: null,
        anon: 0,
        hoursAgo: 50,
        body: 'The "nobody’s seat is going anywhere" line right after a PE buyout should honestly trigger an automatic browser alert to update your resume that night. Even when founders genuinely believe it in week one, debt covenants rewrite the plan by quarter two.',
      },

      // Thread on sty_02 (Northstar terminal director)
      {
        id: 'cmt_05',
        storyId: 'sty_02',
        authorId: 'usr_luis',
        parentId: null,
        anon: 1,
        hoursAgo: 45,
        body: 'Wild seeing Northstar show up twice here with two totally opposite leadership stories. I posted the corporate supply-chain RTO story from this fall — makes total sense that the old-school terminal directors all retired right before the new HQ executives took over.',
      },
      {
        id: 'cmt_06',
        storyId: 'sty_02',
        authorId: 'usr_derrick',
        parentId: 'cmt_05',
        anon: 0,
        hoursAgo: 41,
        body: 'Just read your post and yeah, doesn’t surprise me one bit. Virtually every regional director who knew what the inside of a trailer looked like either retired or jumped to competitors over the last eighteen months.',
      },
      {
        id: 'cmt_07',
        storyId: 'sty_02',
        authorId: 'usr_trevor',
        parentId: null,
        anon: 0,
        hoursAgo: 90,
        body: 'Inviting competing carriers down the street to the VFW hall on a Thursday is legendary. Worth ten thousand LinkedIn "my heart breaks for my affected teammates" posts.',
      },

      // Thread on sty_03 (Remote constructive discharge)
      {
        id: 'cmt_08',
        storyId: 'sty_03',
        authorId: 'usr_claire',
        parentId: null,
        anon: 0,
        hoursAgo: 38,
        body: 'Highlight that last paragraph ten times. The biggest mistake people make in forced long-distance RTO situations is angrily emailing "Consider this my two weeks notice." Once you write those words, unemployment agencies classify it as voluntary quit by default until proven otherwise. Make THEM terminate your access while your written record says you showed up ready to work.',
      },
      {
        id: 'cmt_09',
        storyId: 'sty_03',
        authorId: 'usr_luis',
        parentId: 'cmt_08',
        anon: 1,
        hoursAgo: 34,
        body: 'Yep — HR literally sent me a pre-filled DocuSign form titled "Voluntary Resignation Acknowledgement" three separate times in my last week asking me to sign it to "close out payroll smoothly." Glad I refused to sign.',
      },

      // Thread on sty_04 (Maya CPA exit)
      {
        id: 'cmt_10',
        storyId: 'sty_04',
        authorId: 'usr_samir',
        parentId: null,
        anon: 0,
        hoursAgo: 140,
        body: 'The backchannel reference point is underrated. Internet advice always says "burn it down, two weeks notice is a courtesy," which feels cathartic for twenty minutes and forgets that peers at your level end up hiring across half your city five years later.',
      },
      {
        id: 'cmt_11',
        storyId: 'sty_04',
        authorId: 'usr_maya',
        parentId: 'cmt_10',
        anon: 0,
        hoursAgo: 132,
        body: 'Exactly. You owe zero loyalty to an understaffed billing model, plenty of kindness to the 23-year-old staff associate inheriting your spreadsheet at 9 PM.',
      },

      // Thread on sty_05 (Nate management reflection)
      {
        id: 'cmt_12',
        storyId: 'sty_05',
        authorId: 'usr_priya',
        parentId: null,
        anon: 0,
        hoursAgo: 200,
        body: '"Responsibility without hiring or timeline authority turns good engineers into burned-out shock absorbers." Saving that exact sentence. Respect for owning your side of it instead of pretending management mistakes only happen one floor above us.',
      },

      // Thread on sty_06 (Hospital nursing)
      {
        id: 'cmt_13',
        storyId: 'sty_06',
        authorId: 'usr_derrick',
        parentId: null,
        anon: 0,
        hoursAgo: 110,
        body: 'My sister left med-surg in Ohio last year for the exact same reason — 7 patients on nights and written up for overtime when charting ran past 7:15 AM. Wild how hospital boards find $8M for lobby atrium renovations and claim poverty on float techs.',
      },

      // Thread on sty_07 (Harborlight clean startup wind-down)
      {
        id: 'cmt_14',
        storyId: 'sty_07',
        authorId: 'usr_nate',
        parentId: null,
        anon: 0,
        hoursAgo: 260,
        body: 'Worked for a founder like this in 2019. Startup went to zero, nobody made a dime on equity, and five of the original nine engineers still work together today at his second company (which has been profitable for four years). People remember how you act when there’s nothing left to gain from them.',
      },

      // Thread on sty_08 (Retail to electrical trade)
      {
        id: 'cmt_15',
        storyId: 'sty_08',
        authorId: 'usr_derrick',
        parentId: null,
        anon: 0,
        hoursAgo: 340,
        body: 'Thank you for including the real parts about year-one knees, cold mornings, and checking ego around younger journeymen. Every time trades come up online people either act like you make $140k day one or act like your spine explodes automatically. Preparation + union pension beats salaried retail burnout any day.',
      },
      {
        id: 'cmt_16',
        storyId: 'sty_08',
        authorId: 'usr_trevor',
        parentId: 'cmt_15',
        anon: 0,
        hoursAgo: 330,
        body: 'Ha, appreciate that. Stretch your hamstrings, wear hearing protection around hammer drills in concrete rooms, and pack lunch — those three rules cover 80% of surviving year one.',
      },
    ];

    for (const c of seedComments) {
      const ts = isoDaysAgo(0, c.hoursAgo);
      insertComment.run(
        c.id,
        c.storyId,
        c.authorId,
        c.parentId,
        c.body,
        c.anon,
        ts,
        ts
      );
    }

    // Reactions & Bookmarks (100% genuine rows so every count matches COUNT(*)!)
    const insertReaction = db.prepare(`
      INSERT INTO story_reactions (story_id, user_id, reaction_type, created_at)
      VALUES (?, ?, ?, ?)
    `);
    const allUsers = users.map((u) => u.id);
    const reactionPlan: Record<string, number> = {
      sty_01: 8,
      sty_02: 9,
      sty_03: 7,
      sty_04: 6,
      sty_05: 5,
      sty_06: 7,
      sty_07: 8,
      sty_08: 6,
      sty_09: 7,
      sty_10: 4,
    };

    for (const [storyId, count] of Object.entries(reactionPlan)) {
      for (let i = 0; i < Math.min(count, allUsers.length); i++) {
        insertReaction.run(storyId, allUsers[i], 'helpful', isoDaysAgo(1, i));
        if (i % 2 === 0) {
          insertReaction.run(storyId, allUsers[i], 'relatable', isoDaysAgo(1, i));
        }
      }
    }

    const insertBookmark = db.prepare(`
      INSERT INTO bookmarks (story_id, user_id, created_at) VALUES (?, ?, ?)
    `);
    const bookmarkPairs: [string, string][] = [
      ['sty_01', 'usr_maya'],
      ['sty_07', 'usr_maya'],
      ['sty_09', 'usr_maya'],
      ['sty_01', 'usr_claire'],
      ['sty_01', 'usr_nate'],
      ['sty_02', 'usr_maya'],
      ['sty_02', 'usr_samir'],
      ['sty_02', 'usr_priya'],
      ['sty_03', 'usr_samir'],
      ['sty_03', 'usr_derrick'],
      ['sty_04', 'usr_claire'],
      ['sty_07', 'usr_samir'],
      ['sty_08', 'usr_nate'],
      ['sty_09', 'usr_hannah'],
    ];
    for (const [sId, uId] of bookmarkPairs) {
      insertBookmark.run(sId, uId, isoDaysAgo(2));
    }

    // Comment votes
    const insertVote = db.prepare(`
      INSERT INTO comment_votes (comment_id, user_id, value, created_at)
      VALUES (?, ?, 1, ?)
    `);
    for (const c of seedComments) {
      const voters = allUsers.filter((u) => u !== c.authorId).slice(0, 4);
      for (const v of voters) {
        insertVote.run(c.id, v, isoDaysAgo(1));
      }
    }

    // Seed real notifications for Maya & Moderator
    const insertNotification = db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, body, link_url, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertNotification.run(
      'ntf_01',
      'usr_maya',
      'story_comment',
      'u/samir_infra replied to your story',
      '"The backchannel reference point is underrated. Internet advice always says burn it down..."',
      `/stories/${storySlugs.get('sty_04')}`,
      0,
      isoDaysAgo(1, 3)
    );
    insertNotification.run(
      'ntf_02',
      'usr_maya',
      'moderation_approved',
      'Your story was reviewed and published',
      'Thank you for sharing practical lessons for early-career accountants.',
      `/stories/${storySlugs.get('sty_04')}`,
      1,
      isoDaysAgo(8)
    );
    insertNotification.run(
      'ntf_mod_01',
      'usr_mod',
      'moderation_queue',
      '1 story awaiting editorial safety review',
      'High-care category submission ("Termination") queued for PII & redaction check.',
      '/moderation',
      0,
      isoDaysAgo(1)
    );
  });
}
