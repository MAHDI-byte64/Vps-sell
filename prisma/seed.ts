/**
 * Seeds a believable catalogue plus one admin and one demo customer so the
 * site is browsable the moment it comes up. Re-running is safe: everything
 * upserts on a natural key.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.js";

// Load .env when there is one. In Docker there is not — the values arrive as
// real environment variables — and loadEnvFile throws on a missing file.
try {
  process.loadEnvFile?.(".env");
} catch {
  // no .env; rely on the ambient environment
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const LOCATIONS = [
  { code: "ir-thr", nameFa: "ایران", nameEn: "Iran", cityFa: "تهران", cityEn: "Tehran", countryCode: "IR", sortOrder: 1 },
  { code: "de-fsn", nameFa: "آلمان", nameEn: "Germany", cityFa: "فالکنشتاین", cityEn: "Falkenstein", countryCode: "DE", sortOrder: 2 },
  { code: "nl-ams", nameFa: "هلند", nameEn: "Netherlands", cityFa: "آمستردام", cityEn: "Amsterdam", countryCode: "NL", sortOrder: 3 },
  { code: "fi-hel", nameFa: "فنلاند", nameEn: "Finland", cityFa: "هلسینکی", cityEn: "Helsinki", countryCode: "FI", sortOrder: 4 },
  { code: "tr-ist", nameFa: "ترکیه", nameEn: "Türkiye", cityFa: "استانبول", cityEn: "Istanbul", countryCode: "TR", sortOrder: 5 },
  { code: "us-ash", nameFa: "آمریکا", nameEn: "United States", cityFa: "اشبرن", cityEn: "Ashburn", countryCode: "US", sortOrder: 6 },
];

const OPERATING_SYSTEMS = [
  { slug: "ubuntu-24-04", name: "Ubuntu 24.04 LTS", family: "linux", sortOrder: 1 },
  { slug: "ubuntu-22-04", name: "Ubuntu 22.04 LTS", family: "linux", sortOrder: 2 },
  { slug: "debian-12", name: "Debian 12", family: "linux", sortOrder: 3 },
  { slug: "almalinux-9", name: "AlmaLinux 9", family: "linux", sortOrder: 4 },
  { slug: "rocky-9", name: "Rocky Linux 9", family: "linux", sortOrder: 5 },
  { slug: "centos-7", name: "CentOS 7", family: "linux", sortOrder: 6 },
  { slug: "windows-2022", name: "Windows Server 2022", family: "windows", sortOrder: 7 },
  { slug: "windows-2019", name: "Windows Server 2019", family: "windows", sortOrder: 8 },
];

const PLANS = [
  {
    slug: "vps-linux-starter", type: "VPS_LINUX" as const,
    nameFa: "لینوکس اکونومی", nameEn: "Linux Economy",
    descFa: "مناسب سایت‌های شخصی، ربات تلگرام و پروژه‌های کوچک.",
    descEn: "Right for personal sites, bots and small side projects.",
    cpuCores: 1, cpuNoteFa: "AMD EPYC", cpuNoteEn: "AMD EPYC",
    ramMb: 1024, diskGb: 20, bandwidthGb: 1000, portMbps: 1000, ipv4Count: 1,
    priceMonthly: 149_000, sortOrder: 1, featured: false,
  },
  {
    slug: "vps-linux-basic", type: "VPS_LINUX" as const,
    nameFa: "لینوکس پایه", nameEn: "Linux Basic",
    descFa: "برای سایت‌های وردپرسی و اپلیکیشن‌های در حال رشد.",
    descEn: "For WordPress sites and apps that are picking up traffic.",
    cpuCores: 2, cpuNoteFa: "AMD EPYC", cpuNoteEn: "AMD EPYC",
    ramMb: 2048, diskGb: 40, bandwidthGb: 2000, portMbps: 1000, ipv4Count: 1,
    priceMonthly: 289_000, sortOrder: 2, featured: true,
  },
  {
    slug: "vps-linux-pro", type: "VPS_LINUX" as const,
    nameFa: "لینوکس حرفه‌ای", nameEn: "Linux Pro",
    descFa: "توان پردازشی بیشتر برای دیتابیس و سرویس‌های پرترافیک.",
    descEn: "More headroom for databases and busy services.",
    cpuCores: 4, cpuNoteFa: "AMD EPYC اختصاصی", cpuNoteEn: "Dedicated AMD EPYC",
    ramMb: 8192, diskGb: 100, bandwidthGb: 5000, portMbps: 1000, ipv4Count: 1,
    priceMonthly: 749_000, sortOrder: 3, featured: true,
  },
  {
    slug: "vps-linux-enterprise", type: "VPS_LINUX" as const,
    nameFa: "لینوکس سازمانی", nameEn: "Linux Enterprise",
    descFa: "برای زیرساخت تولیدی با نیاز به منابع تضمین‌شده.",
    descEn: "Production infrastructure with guaranteed resources.",
    cpuCores: 8, cpuNoteFa: "AMD EPYC اختصاصی", cpuNoteEn: "Dedicated AMD EPYC",
    ramMb: 16384, diskGb: 200, bandwidthGb: 0, portMbps: 1000, ipv4Count: 2,
    priceMonthly: 1_490_000, sortOrder: 4, featured: false,
  },
  {
    slug: "vps-windows-basic", type: "VPS_WINDOWS" as const,
    nameFa: "ویندوز پایه", nameEn: "Windows Basic",
    descFa: "ویندوز سرور با لایسنس معتبر و دسترسی ریموت دسکتاپ.",
    descEn: "Windows Server with a valid licence and RDP access.",
    cpuCores: 2, cpuNoteFa: "Intel Xeon", cpuNoteEn: "Intel Xeon",
    ramMb: 4096, diskGb: 60, bandwidthGb: 2000, portMbps: 1000, ipv4Count: 1,
    priceMonthly: 590_000, sortOrder: 5, featured: true,
  },
  {
    slug: "vps-windows-pro", type: "VPS_WINDOWS" as const,
    nameFa: "ویندوز حرفه‌ای", nameEn: "Windows Pro",
    descFa: "مناسب نرم‌افزارهای حسابداری، متاتریدر و ابزارهای سازمانی.",
    descEn: "Built for accounting software, MetaTrader and business tooling.",
    cpuCores: 4, cpuNoteFa: "Intel Xeon", cpuNoteEn: "Intel Xeon",
    ramMb: 8192, diskGb: 120, bandwidthGb: 4000, portMbps: 1000, ipv4Count: 1,
    priceMonthly: 1_190_000, sortOrder: 6, featured: false,
  },
  {
    slug: "dedicated-ryzen", type: "DEDICATED" as const,
    nameFa: "اختصاصی رایزن", nameEn: "Dedicated Ryzen",
    descFa: "سرور فیزیکی کامل، بدون همسایه و بدون اشتراک منابع.",
    descEn: "A whole physical machine — no neighbours, no shared resources.",
    cpuCores: 12, cpuNoteFa: "Ryzen 9 7900", cpuNoteEn: "Ryzen 9 7900",
    ramMb: 65536, diskGb: 1024, bandwidthGb: 0, portMbps: 1000, ipv4Count: 1,
    priceMonthly: 4_900_000, sortOrder: 7, featured: false,
  },
  {
    slug: "dedicated-epyc", type: "DEDICATED" as const,
    nameFa: "اختصاصی EPYC", nameEn: "Dedicated EPYC",
    descFa: "بالاترین توان پردازشی برای بارهای سنگین و مجازی‌سازی.",
    descEn: "Top-end compute for heavy workloads and virtualisation.",
    cpuCores: 32, cpuNoteFa: "AMD EPYC 7443P", cpuNoteEn: "AMD EPYC 7443P",
    ramMb: 131072, diskGb: 2048, bandwidthGb: 0, portMbps: 10000, ipv4Count: 2,
    priceMonthly: 9_800_000, sortOrder: 8, featured: false,
  },
];

const POSTS = [
  {
    slug: "secure-your-vps-first-hour",
    coverEmoji: "🔐",
    titleFa: "اولین ساعت بعد از تحویل سرور: چک‌لیست امنیتی",
    titleEn: "The first hour with a new VPS: a security checklist",
    excerptFa: "پیش از نصب هر چیزی، این شش کار را روی سرور تازه‌تان انجام دهید تا خیالتان راحت باشد.",
    excerptEn: "Six things to do on a brand-new server before you install anything else.",
    tags: ["security", "linux"],
    bodyFa: `## چرا همان ساعت اول مهم است؟
سرورهای تازه ظرف چند دقیقه پس از فعال شدن آی‌پی، هدف اسکن خودکار قرار می‌گیرند. کارهای زیر جلوی بیشتر این حمله‌ها را می‌گیرد.

## ۱. رمز عبور root را عوض کنید
اولین کار پس از ورود:

\`\`\`bash
passwd
\`\`\`

## ۲. یک کاربر غیر root بسازید
\`\`\`bash
adduser deploy
usermod -aG sudo deploy
\`\`\`

## ۳. ورود با کلید SSH را فعال کنید
کلید عمومی خود را منتقل کنید و سپس ورود با رمز را ببندید:

\`\`\`bash
ssh-copy-id deploy@YOUR_SERVER_IP
\`\`\`

سپس در فایل \`/etc/ssh/sshd_config\`:

\`\`\`
PermitRootLogin no
PasswordAuthentication no
\`\`\`

## ۴. فایروال را روشن کنید
\`\`\`bash
ufw allow OpenSSH
ufw enable
\`\`\`

## ۵. به‌روزرسانی‌ها را نصب کنید
\`\`\`bash
apt update && apt upgrade -y
\`\`\`

## ۶. fail2ban را نصب کنید
\`\`\`bash
apt install fail2ban -y
systemctl enable --now fail2ban
\`\`\`

با این شش قدم، سرور شما از دسترس بیشتر حمله‌های خودکار خارج می‌شود.`,
    bodyEn: `## Why the first hour matters
A fresh IP starts attracting automated scans within minutes of coming online. The steps below shut out the overwhelming majority of them.

## 1. Change the root password
The very first thing after you log in:

\`\`\`bash
passwd
\`\`\`

## 2. Create a non-root user
\`\`\`bash
adduser deploy
usermod -aG sudo deploy
\`\`\`

## 3. Switch to SSH keys
Copy your public key across, then close off password logins:

\`\`\`bash
ssh-copy-id deploy@YOUR_SERVER_IP
\`\`\`

Then in \`/etc/ssh/sshd_config\`:

\`\`\`
PermitRootLogin no
PasswordAuthentication no
\`\`\`

## 4. Turn on the firewall
\`\`\`bash
ufw allow OpenSSH
ufw enable
\`\`\`

## 5. Apply updates
\`\`\`bash
apt update && apt upgrade -y
\`\`\`

## 6. Install fail2ban
\`\`\`bash
apt install fail2ban -y
systemctl enable --now fail2ban
\`\`\`

Six steps, and your server drops off the radar of nearly every automated attack.`,
  },
  {
    slug: "choosing-vps-specs",
    coverEmoji: "📊",
    titleFa: "چقدر رم و CPU لازم دارم؟ راهنمای انتخاب پلن",
    titleEn: "How much RAM and CPU do I actually need?",
    excerptFa: "پرداخت بیش از حد به اندازه کم‌آوردن منابع آزاردهنده است. این راهنما به شما کمک می‌کند اندازه درست را انتخاب کنید.",
    excerptEn: "Overpaying hurts as much as running out. Here is how to size a server properly.",
    tags: ["guide", "performance"],
    bodyFa: `## قانون کلی
منابع را بر اساس بار واقعی انتخاب کنید، نه بر اساس بیشترین چیزی که تصور می‌کنید لازم دارید. ارتقا همیشه ممکن است؛ پول برگشت‌ناپذیر نه.

## سایت شخصی یا وبلاگ
یک هسته و ۱ گیگابایت رم کافی است. پلن اکونومی دقیقاً برای همین ساخته شده.

## وردپرس با ترافیک متوسط
۲ هسته و ۲ گیگابایت رم. اگر افزونه زیاد دارید، ۴ گیگابایت را در نظر بگیرید.

## دیتابیس PostgreSQL یا MySQL
رم مهم‌ترین عامل است. برای دیتاستی که فعالانه خوانده می‌شود، رم را دست‌کم هم‌اندازه بخش فعال دیتابیس بگیرید.

## پنل‌های مدیریتی
سی‌پنل و دایرکت‌ادمین به‌تنهایی حدود ۱ گیگابایت رم مصرف می‌کنند. آن را به نیاز واقعی سایت اضافه کنید.

## چطور بفهمم کم آورده‌ام؟
\`\`\`bash
free -h
uptime
\`\`\`

اگر \`load average\` مرتباً از تعداد هسته‌ها بیشتر است، وقت ارتقای CPU است. اگر \`swap\` مدام در حال استفاده است، رم کم دارید.`,
    bodyEn: `## The general rule
Size for your real load, not for the worst case you can imagine. Upgrading is always possible; money already spent is not.

## Personal site or blog
One core and 1 GB of RAM. The Economy plan exists precisely for this.

## WordPress with moderate traffic
2 cores and 2 GB. If you run a lot of plugins, budget for 4 GB.

## A PostgreSQL or MySQL database
RAM is the deciding factor. For a dataset that is actively read, give the machine at least as much RAM as the working set.

## Control panels
cPanel and DirectAdmin consume roughly 1 GB on their own. Add that on top of what the site itself needs.

## How do I know I am short?
\`\`\`bash
free -h
uptime
\`\`\`

If \`load average\` sits consistently above your core count, it is time for more CPU. If swap is in constant use, you are short on RAM.`,
  },
  {
    slug: "nvme-vs-ssd",
    coverEmoji: "⚡",
    titleFa: "NVMe در برابر SSD: تفاوت واقعاً کجا دیده می‌شود؟",
    titleEn: "NVMe vs SSD: where the difference actually shows",
    excerptFa: "اعداد بنچمارک چشمگیرند، اما در کدام سناریوها واقعاً تفاوت را حس می‌کنید؟",
    excerptEn: "The benchmark numbers look dramatic — but when do you actually feel them?",
    tags: ["hardware", "performance"],
    bodyFa: `## تفاوت در کجاست؟
دیسک‌های SATA SSD از رابطی استفاده می‌کنند که برای هارد دیسک‌های مکانیکی طراحی شده بود. NVMe مستقیماً روی خط PCIe می‌نشیند و این گلوگاه را حذف می‌کند.

## اعداد
- SATA SSD: حدود ۵۵۰ مگابایت بر ثانیه
- NVMe نسل ۳: حدود ۳٬۵۰۰ مگابایت بر ثانیه
- NVMe نسل ۴: حدود ۷٬۰۰۰ مگابایت بر ثانیه

## کجا تفاوت را حس می‌کنید؟
تفاوت اصلی در **IOPS** و **تأخیر** است، نه صرفاً سرعت انتقال پیوسته:

- کوئری‌های دیتابیس با خواندن تصادفی زیاد
- بیلد پروژه‌های بزرگ (npm install، کامپایل)
- بازگردانی بکاپ
- سایت‌هایی با هزاران فایل کوچک

## کجا تفاوتی حس نمی‌کنید؟
اگر سرور شما یک ربات ساده یا پروکسی است که عملاً به دیسک دست نمی‌زند، NVMe تغییری در تجربه شما نمی‌دهد. آنجا رم و شبکه مهم‌ترند.`,
    bodyEn: `## What is different
SATA SSDs speak over an interface designed for spinning disks. NVMe sits directly on PCIe lanes and removes that bottleneck.

## The numbers
- SATA SSD: around 550 MB/s
- NVMe Gen 3: around 3,500 MB/s
- NVMe Gen 4: around 7,000 MB/s

## Where you feel it
The real gain is in **IOPS** and **latency**, not just sequential throughput:

- Database queries with heavy random reads
- Building large projects (npm install, compilation)
- Restoring backups
- Sites made of thousands of small files

## Where you do not
If your server is a simple bot or a proxy that barely touches disk, NVMe changes nothing you can perceive. There, RAM and network matter far more.`,
  },
];

const COUPONS = [
  {
    code: "WELCOME15", type: "PERCENT" as const, value: 15,
    maxDiscount: 500_000, firstOrderOnly: true, maxUsesPerUser: 1,
    descriptionFa: "۱۵٪ تخفیف اولین سفارش", descriptionEn: "15% off your first order",
  },
  {
    code: "NOWRUZ", type: "FIXED" as const, value: 200_000,
    minOrder: 1_000_000, maxUses: 200, maxUsesPerUser: 1,
    descriptionFa: "۲۰۰ هزار تومان تخفیف نوروزی", descriptionEn: "200,000 Toman off",
  },
];

async function main() {
  console.log("→ locations");
  const locations = await Promise.all(
    LOCATIONS.map((location) =>
      prisma.location.upsert({ where: { code: location.code }, create: location, update: location }),
    ),
  );

  console.log("→ operating systems");
  await Promise.all(
    OPERATING_SYSTEMS.map((os) =>
      prisma.operatingSystem.upsert({ where: { slug: os.slug }, create: os, update: os }),
    ),
  );

  console.log("→ plans");
  for (const plan of PLANS) {
    // Windows is not offered in every region; Linux and dedicated boxes are.
    const available =
      plan.type === "VPS_WINDOWS"
        ? locations.filter((l) => ["de-fsn", "nl-ams", "tr-ist"].includes(l.code))
        : plan.type === "DEDICATED"
          ? locations.filter((l) => ["de-fsn", "fi-hel"].includes(l.code))
          : locations;

    const connect = available.map((l) => ({ id: l.id }));
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      create: { ...plan, locations: { connect } },
      update: { ...plan, locations: { set: connect } },
    });
  }

  console.log("→ accounts");
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@vpssell.local").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      name: "مدیر سیستم",
      role: "ADMIN",
      emailVerified: true,
    },
    // Keep the role and password in sync on re-seed so a locked-out operator
    // can always recover by running the seed again.
    update: { role: "ADMIN", passwordHash: adminHash, active: true },
  });

  const demoHash = await bcrypt.hash("Demo@12345", 12);
  await prisma.user.upsert({
    where: { email: "demo@vpssell.local" },
    create: {
      email: "demo@vpssell.local",
      passwordHash: demoHash,
      name: "کاربر نمونه",
      phone: "09120000000",
      walletBalance: 500_000,
      emailVerified: true,
    },
    update: { passwordHash: demoHash, active: true },
  });

  console.log("→ coupons");
  await Promise.all(
    COUPONS.map((coupon) =>
      prisma.coupon.upsert({ where: { code: coupon.code }, create: coupon, update: coupon }),
    ),
  );

  console.log("→ blog posts");
  for (const post of POSTS) {
    const data = { ...post, published: true, publishedAt: new Date(), authorId: admin.id };
    await prisma.post.upsert({
      where: { slug: post.slug },
      create: data,
      // Leave publishedAt alone on re-seed so the ordering stays stable.
      update: { ...post, published: true, authorId: admin.id },
    });
  }

  console.log("\n✅ seed complete");
  console.log(`   admin: ${adminEmail} / ${adminPassword}`);
  console.log("   demo:  demo@vpssell.local / Demo@12345");
}

main()
  .catch((error) => {
    console.error("seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
