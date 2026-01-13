"""
Manually add curated sources to the RAG database.
No web scraping - just paste in your content and metadata.

Usage:
    python scripts/add_manual_source.py
"""

import asyncio
import sys
from pathlib import Path
from uuid import UUID
from typing import List, Optional
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ingest.web_content_ingest import get_db_connection, chunk_text, generate_embedding


async def add_manual_source(
    url: str,
    title: str,
    content: str,
    source_type: str = "gov_website",
    publisher: str = "",
    topics: List[str] = None,
    credibility_score: float = 1.0,
    politician_ids: List[UUID] = None
):
    """
    Add a manually curated source to the database.
    
    Args:
        url: Source URL (e.g., https://www.congress.gov/about)
        title: Document title
        content: The full text content you want to store
        source_type: Type of source (gov_website, official_document, etc.)
        publisher: Publisher name (e.g., "U.S. Congress")
        topics: List of topics (e.g., ["congress", "legislation"])
        credibility_score: 0-1 score (default 1.0 for .gov sites)
        politician_ids: Optional list of politician UUIDs
    """
    
    print("=" * 60)
    print("📝 Adding Manual Source")
    print("=" * 60)
    print(f"Title: {title}")
    print(f"URL: {url}")
    print(f"Content length: {len(content)} characters")
    print(f"Topics: {topics or []}")
    print()
    
    # Connect to database
    conn = await get_db_connection()
    
    try:
        # Check if source already exists
        existing = await conn.fetchval(
            "SELECT id FROM rag_sources WHERE source_url = $1",
            url
        )
        
        if existing:
            print(f"⚠️  Source already exists with ID: {existing}")
            print("   Skipping insertion.")
            return existing
        
        # Insert source
        source_id = await conn.fetchval("""
            INSERT INTO rag_sources (
                source_url, source_type, title, publisher, full_text,
                politician_ids, topics, credibility_score, retrieved_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        """, url, source_type, title, publisher, content,
             politician_ids or [], topics or [], credibility_score, datetime.utcnow())
        
        print(f"✅ Created source with ID: {source_id}")
        
        # Chunk the text
        chunks = chunk_text(content)
        print(f"📄 Created {len(chunks)} chunks")
        print()
        
        # Generate embeddings and insert chunks
        print("🔄 Generating embeddings and inserting chunks...")
        for idx, chunk in enumerate(chunks):
            try:
                # Generate embedding
                embedding = generate_embedding(chunk)
                
                # Convert to pgvector format
                embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
                
                # Insert chunk
                await conn.execute("""
                    INSERT INTO rag_chunks (
                        source_id, text, chunk_index, embedding, politician_ids
                    ) VALUES ($1, $2, $3, $4::vector, $5)
                """, source_id, chunk, idx, embedding_str, politician_ids or [])
                
                if (idx + 1) % 10 == 0 or idx == len(chunks) - 1:
                    print(f"   ✓ Inserted {idx + 1}/{len(chunks)} chunks")
                    
            except Exception as e:
                print(f"   ❌ Error processing chunk {idx}: {e}")
                continue
        
        print()
        print("=" * 60)
        print("✨ Source added successfully!")
        print("=" * 60)
        return source_id
        
    finally:
        await conn.close()


async def main():
    """Add curated sources from congress.gov, govtrack.us, and usa.gov"""
    
    print("\n" + "=" * 60)
    print("🇺🇸 CivicLens Manual Source Ingestion")
    print("=" * 60)
    print()
    
    # Example sources - edit these with your manually curated content
    sources = [
        {
            "url": "https://www.govtrack.us/congress/votes/119-2025/h123",
            "title": "H.R. 1834 - Affordable Care Act Subsidy Extension - House Vote",
            "publisher": "GovTrack.us",
            "source_type": "official_document",
            "topics": ["healthcare", "voting records", "H.R. 1834", "bill votes", "affordable care act"],
            "credibility_score": 0.9,
            "content": """
H.R. 1834: Affordable Care Act Subsidy Extension

Bill Summary:
This bill reinstates enhanced Affordable Care Act subsidies for three years.

Vote Results:
Total Yea votes: 230
- Republicans voting Yea: 17
- Democrats voting Yea: 213

Total Nay votes: 196
- Republicans voting Nay: 196
- Democrats voting Nay: 0

Statistically Notable Republican Yea Votes:
These Republicans voted YES on H.R. 1834, breaking with their party:

1. David Valadao (R-CA-22) - Yea
2. Jeff Hurd (R-CO-3) - Yea
3. Maria Salazar (R-FL-27) - Yea
4. Zachary Nunn (R-IA-3) - Yea
5. Thomas Kean (R-NJ-7) - Yea
6. Nicolas LaLota (R-NY-1) - Yea

These six Republicans joined all Democrats in supporting the bill, while the remaining 196 Republicans voted against it. The bill passed with bipartisan support, primarily from Democrats.
            """.strip()
        },
        {
            "url": "https://clerk.house.gov/",
            "title": "Office of the Clerk - U.S. House of Representatives",
            "publisher": "U.S. House of Representatives",
            "source_type": "official_document",
            "topics": ["house", "legislation", "voting records", "official records"],
            "credibility_score": 1.0,
            "content": """
The Office of the Clerk serves as the chief legislative officer of the U.S. House of Representatives. 
The Clerk maintains and publishes all official House records, legislative documents, and proceedings.

Key Functions of the Clerk's Office:

Legislative Records: The Clerk maintains custody of all legislative documents including bills, 
resolutions, committee reports, and amendments. All official legislative actions are recorded and 
published by the Clerk's office.

Roll Call Votes: The Office of the Clerk records and publishes all roll call votes taken on the 
House floor. These voting records show how each member voted on bills, amendments, and procedural 
matters. Vote tallies are available immediately after each vote is concluded.

Official Documents: The Clerk publishes the House Journal, which is the official record of House 
proceedings. The Journal includes votes, actions taken, messages from the President and Senate, 
and other official business.

Member Information: The Clerk maintains biographical and contact information for all current 
House members. This includes committee assignments, leadership positions, and district information.

Legislative Statistics: The office compiles statistics on legislative activity including bills 
introduced, votes taken, committee meetings held, and laws enacted. These statistics help track 
congressional productivity and activity.

Election Certificates: The Clerk receives and processes certificates of election for newly 
elected members. The Clerk presides over the House at the start of each new Congress until 
a Speaker is elected.

Public Access: The Clerk's website provides public access to legislative documents, voting records, 
and House rules. Citizens can track legislation, view voting records, and access historical 
congressional records.

Committee Information: The office maintains records of all House committees, including membership, 
jurisdiction, and meeting schedules. Committee reports and legislative documents are published 
through the Clerk's office.

The Office of the Clerk plays a crucial role in maintaining transparency and public access to 
House proceedings. All records maintained by the Clerk are considered official documents of the 
U.S. House of Representatives.
            """.strip()
        },
        {
            "url": "https://www.congress.gov/about",
            "title": "About Congress.gov",
            "publisher": "U.S. Congress",
            "source_type": "gov_website",
            "topics": ["congress", "legislation", "government"],
            "credibility_score": 1.0,
            "content": """
Congress.gov is the official website for U.S. federal legislative information. 
The Library of Congress presents Congress.gov as a collaborative project with the 
House, Senate, and Government Publishing Office to make federal legislative information 
available to the public.

Congress.gov provides the full text of legislation, bill summaries, bill status, 
legislative process information, Congressional Record, committee information, 
member information, and treaty information. The site covers legislation from the 
93rd Congress (1973) to the present.

Users can search for bills by number, keyword, sponsor, or committee. The site 
provides detailed bill status showing each step in the legislative process. 
Committee reports, hearing transcripts, and other congressional documents are 
also available.

The Congressional Record is the official record of the proceedings and debates 
of the United States Congress. It is published daily when Congress is in session. 
The Record includes everything said on the House and Senate floors, along with 
additional written materials submitted by members.

Congress consists of two chambers: the House of Representatives with 435 members 
serving two-year terms, and the Senate with 100 members (two from each state) 
serving six-year terms. All legislation must pass both chambers and be signed 
by the President to become law.

H.R.7005 - To prohibit discrimination in public accommodations on the basis of sex, 
gender identity, and sexual orientation, and for other purposes. Sponsor: Rep. Watson Coleman, 
Bonnie [D-NJ-12] (Introduced 01/09/2026). Committees:	House - Judiciary
Latest Action:	House - 01/09/2026 Referred to the House Committee on the Judiciary. 

H.R.1043 - La Paz County Solar Energy and Job Creation Act. 
Sponsor: Rep. Gosar, Paul A. [R-AZ-9] (Introduced 02/06/2025)
Committees:	House - Natural Resources | Senate - Energy and Natural Resources
Committee Meetings:	09/11/25 9:00AM 04/09/25 10:00AM
Committee Reports:	H. Rept. 119-183
Latest Action:	12/29/2025 Became Public Law No: 119-68
This bill directs the Department of the Interior, after receiving a request from La Paz County, Arizona, to convey 
approximately 3,400 acres of identified land managed by the Bureau of Land Management to the county for fair market value.
Interior must exclude from the conveyance any federal land that contains significant cultural, environmental, wildlife, 
or recreational resources. As a condition of the conveyance, La Paz County and any subsequent owner must
make good faith efforts to avoid disturbing tribal artifacts;
minimize impacts on tribal artifacts if they are disturbed;
coordinate with the Colorado River Indian Tribes Tribal Historic Preservation Office to identify 
artifacts of cultural and historic significance; and allow tribal representatives to 
rebury unearthed artifacts at, or near, where they were discovered. 
The federal land is withdrawn from the operation of U.S. mining and mineral leasing laws.
            """.strip()
        },
        {
            "url": "https://www.govtrack.us/about",
            "title": "About GovTrack",
            "publisher": "GovTrack.us",
            "source_type": "gov_website",
            "topics": ["congress", "legislation", "tracking", "voting"],
            "credibility_score": 0.9,
            "content": """
GovTrack.us is a civic technology project that tracks the activities of the 
United States Congress. It was created in 2004 to make congressional information 
more accessible to the public.

GovTrack provides tracking tools for legislation, including bill text, status 
updates, and voting records. Users can track bills, get email updates, and see 
how their representatives vote on issues.

The site offers visualizations of congressional data including statistics on 
legislative effectiveness, cosponsorship networks, and voting patterns. It shows 
which members of Congress are most active in proposing legislation and which 
bills have the most cosponsors.

GovTrack provides ideological scores for members of Congress based on their 
voting records. These scores show how liberal or conservative a member is 
compared to other members of Congress. The site also tracks leadership positions, 
committee assignments, and caucus memberships.

For each bill, GovTrack shows the bill's sponsors, cosponsors, current status, 
and full text. Users can see the bill's path through the legislative process 
and read analyses of what the bill would do. The site sends automatic email 
alerts when tracked bills are updated.

GovTrack aggregates data from official congressional sources and presents it
in an easy-to-use format for researchers, journalists, and citizens tracking
legislative activity.
            """.strip()
        },
        {
            "url": "https://www.usa.gov/how-laws-are-made",
            "title": "How Laws Are Made",
            "publisher": "USA.gov",
            "source_type": "official_document",
            "topics": ["legislation", "lawmaking", "government process"],
            "credibility_score": 1.0,
            "content": """
The process of making federal laws in the United States involves several steps 
and requires approval from both chambers of Congress and the President.

Step 1: A bill is introduced
Any member of Congress can introduce a bill. In the House of Representatives, 
a bill is introduced when it is placed in the hopper (a wooden box on the House floor). 
In the Senate, members must gain recognition of the presiding officer to announce 
the introduction of a bill during the morning hour.

Step 2: The bill goes to committee
Once introduced, the bill is assigned to a committee. Committees review, research, 
and revise the bill before voting on whether to send it back to the House or Senate floor. 
Most bills die in committee and never receive a floor vote.

Step 3: Subcommittee review
Often, bills are referred to a subcommittee for further study and hearings. 
Hearings allow committee members to hear from experts, government officials, 
and stakeholders about the bill. The subcommittee may make changes to the bill.

Step 4: Committee mark up
After hearings, the committee or subcommittee meets to make changes and amendments 
to the bill. This is called the "mark up" session. If the committee votes in 
favor of the bill, it is reported to the full chamber.

Step 5: Floor action
Once reported, the bill is placed on the calendar for floor action. In the House, 
the Rules Committee typically sets the terms for debate. The full chamber debates 
the bill and may propose amendments. After debate, the chamber votes on the bill.

Step 6: The bill moves to the other chamber
If the bill passes one chamber, it moves to the other chamber where it goes through 
a similar process of committee review, floor debate, and voting.

Step 7: Conference committee
If the House and Senate pass different versions of the bill, a conference committee 
of members from both chambers meets to resolve the differences. The compromise 
bill is then sent back to both chambers for a final vote.

Step 8: Presidential action
Once both chambers pass the same version of the bill, it is sent to the President. 
The President can sign the bill into law, veto it, or take no action. If the 
President vetoes the bill, Congress can override the veto with a two-thirds vote 
in both chambers.

A bill becomes law when it is signed by the President or when Congress overrides 
a presidential veto. The new law is assigned a public law number and published 
in the United States Statutes at Large.

How to check your immigration case status and find processing times
If you filed an immigration application or petition with the U.S. Citizenship 
and Immigration Services (USCIS), you can check the progress of your case’s status 
online or by phone. And learn how long it may take to process it.
Check your immigration case status
Online: Use the case status online tool to check for updates about your immigration 
case. You will need your 13-character receipt number from your application or petition.
By phone: If you are calling from the U.S., contact the USCIS Contact Center at 1-800-375-5283 
or TTY 1-800-767-1833. If you are outside the U.S., call 212-620-3418 or contact a USCIS 
international field office.

Become a U.S. citizen through naturalization
Naturalization is the process of voluntarily becoming a United States citizen. 
Learn about the steps that lead to U.S. citizenship, including the naturalization test.
What are the requirements for U.S. citizenship?
To be eligible for U.S. citizenship, you must meet certain eligibility requirements. 
These include being:
At least 18 years old when you apply
Able to read, write, and speak basic English (depending on age)
Of good moral character

How to apply for U.S. citizenship:
Follow the 10-step naturalization process from the U.S. Citizenship and Immigration 
Services (USCIS). You will learn:
If you are eligible for naturalization
How to fill out Form N-400 to apply for naturalization
What to do before taking the oath of citizenship
            """.strip()
        }
    ]
    
    # Add each source
    success_count = 0
    for i, source in enumerate(sources, 1):
        print(f"\n📥 [{i}/{len(sources)}] Processing source...")
        try:
            await add_manual_source(**source)
            success_count += 1
        except Exception as e:
            print(f"❌ Failed to add source: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 60)
    print(f"✨ Ingestion Complete!")
    print(f"   Successfully added: {success_count}/{len(sources)} sources")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  1. Test the AI: http://localhost:3000/ask")
    print("  2. Ask questions like:")
    print("     - 'How are laws made in Congress?'")
    print("     - 'What is Congress.gov?'")
    print("     - 'How does GovTrack work?'")
    print("  3. Citations should show 'database' sources!")
    print()
    print("To add more sources:")
    print("  - Edit this file and add to the 'sources' list")
    print("  - Or call add_manual_source() directly")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
