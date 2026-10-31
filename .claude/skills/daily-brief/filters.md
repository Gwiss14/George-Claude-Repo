# Noise filters

Tuning file. Add senders here as they turn out to be noise; this is the part of the brief
that gets better with use.

## Why Gmail operators are not enough

`-list:*` looks like it should strip every newsletter, since bulk senders set `List-Unsubscribe`.
Measured against this inbox it does not hold: a 30-day window with `-list:*` returned 10 clean
threads, but the same operator over a 30–180 day window still returned pages of marketing.
Gmail applies `list:` per-message and matches loosely, so a thread survives if any message
lacks the header.

Treat every Gmail query as a **coarse net**. The judgment stage is what makes the brief usable.
Do not tighten the query until it returns only signal — that silently drops real mail.

## Known noise senders

Bulk / marketing:

```
alphatraderfirm.com        nicholascrown.com        mail.beehiiv.com
nytdirect@nytimes.com      news.bloomberg.com       dupple.com
iwillteachyoutoberich.com  mail.joinsuperhuman.ai   hackmotion.com
springfinancial.ca         thesidehustledaily.com   almeidaracingacademy.com
milesdeutscher.com.au      spotify.com              oopbuy.com
```

Automated, no action possible:

```
info@x.com                 notify@updates.notion.so  alerts@help.clickup.com
autonotification@wes.org   feedbacksurvey@wes.org    wesresearch@qemailserver.com
donotreply@match.indeed.com  easwaaqmisr.com         support@ionos.ca
studentservice@7sage.com   admin@lucidtrading.com
```

## Subject patterns that mean noise despite urgent wording

Marketing mail imitates transactional mail on purpose. These are noise unless the sender is a
real correspondent:

```
Your Account Status: ACTION NEEDED    Your Account Approved
Your Reset has been activated         Your * Account Update
* OFF *                               Flash SALE
Your * confirmation code is           Your * Login Code
Password reset instructions           A new device logged into your account
We Value Your Feedback                tell us about your * experience
```

## Real correspondents

Anyone here outranks the rubric — their mail is never noise:

```
registrar@dyc.edu           D'Youville registrar — transcripts, admissions
jwissa@rogers.com           family
Mario_said7@outlook.com     personal
camnelson99@gmail.com       personal
dylan.rispoli@7sage.com     LSAT tutoring — a person, unlike studentservice@7sage.com
secure@signority.com        e-signature requests — automated but always actionable
info@emtcoptometry.com      optometrist
```

Note the 7sage split: `dylan.rispoli@` is a human worth answering, `studentservice@` is a
robot. Sender-domain filtering alone would get this wrong in both directions.
