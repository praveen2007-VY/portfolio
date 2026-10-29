-- =============================================================================
-- GENERATED FILE — do not edit by hand. Source: src/lib/content/resume.ts
-- Regenerate with: npm run seed:generate
--
-- Safe to rerun: each table is only seeded while it is empty, so changes made
-- in the admin dashboard are never overwritten.
-- =============================================================================

-- profiles
do $seed$
begin
  if not exists (select 1 from public.profiles) then
insert into public.profiles (full_name, headline, about, focus_areas, location, email, show_email, phone, show_phone, avatar_path, resume_path, resume_file_name, resume_updated_at, github_url, linkedin_url, leetcode_url, codechef_url, website_url)
values
    ('Praveen', 'AI & Data Science Student | AI Developer | Full-Stack Developer | Cloud & DevOps Enthusiast', 'I''m a B.Tech Artificial Intelligence and Data Science student at KIT – Kalaignarkarunanidhi Institute of Technology, Coimbatore, focused on building practical software that puts AI to work.

My projects span computer vision, NLP and full-stack development — from Sign Aura, a platform that converts video content into sign-language output and received a ₹10,000 Vidhya Incubation grant, to a real-time airport shuttle monitoring system built on the MERN stack with n8n automation.

Through internships in artificial intelligence and in DevOps with AWS, I''ve worked hands-on with EC2, VPC, S3, IAM and Linux. I keep my problem-solving sharp through competitive programming, with 530+ DSA problems solved across LeetCode and CodeChef.', array['Artificial intelligence & machine learning', 'Computer vision & NLP', 'Full-stack web development', 'Cloud infrastructure on AWS', 'Data structures & algorithms']::text[], 'Coimbatore, Tamil Nadu, India', 'kit28.24bad118@gmail.com', true, '+91 9965293440', false, null, null, null, null, 'https://github.com/praveen2007-VY', 'https://www.linkedin.com/in/praveen-r-251a78358', null, null, null);
  end if;
end;
$seed$;

-- site_settings (draft + published)
insert into public.site_settings (variant, hero_eyebrow, hero_greeting, hero_title, hero_highlight, hero_intro, sections, accent, animation_level, enable_3d, coding_summary, footer_text, seo_title, seo_description)
values
    ('draft', 'B.Tech AI & Data Science · KIT, Coimbatore', 'Hi, I''m Praveen.', 'Building Intelligent Experiences with AI, Software & Cloud.', 'AI, Software & Cloud', 'AI & Data Science undergraduate building accessible AI products, real-time full-stack systems and cloud infrastructure — with internship experience in artificial intelligence and DevOps on AWS.', '{"about":{"visible":true,"eyebrow":"About","title":"Engineering intelligent software, end to end.","description":""},"experience":{"visible":true,"eyebrow":"Journey","title":"Experience & education","description":"Internships and academics that shaped how I build."},"skills":{"visible":true,"eyebrow":"Toolkit","title":"Technical skills","description":"Languages, frameworks and platforms I work with, grouped by discipline."},"projects":{"visible":true,"eyebrow":"Selected work","title":"Featured projects","description":"Products I''ve designed and built across AI, computer vision and full-stack development."},"certificates":{"visible":true,"eyebrow":"Credentials","title":"Certifications & courses","description":"Formal coursework that complements my hands-on projects."},"achievements":{"visible":true,"eyebrow":"Recognition","title":"Achievements","description":"Grants, hackathons and milestones along the way."},"coding":{"visible":true,"eyebrow":"Problem solving","title":"Competitive programming","description":"Consistent practice in data structures and algorithms."},"contact":{"visible":true,"eyebrow":"Contact","title":"Let''s build something together.","description":"Open to internships, collaborations and conversations about AI, software and cloud. I''ll get back to you as soon as I can."}}'::jsonb, 'cobalt', 'full', true, 'Solved 530+ DSA problems across competitive programming platforms.', 'Designed and built with Next.js, Three.js and Supabase.', 'Praveen — AI Developer & Full-Stack Engineer', 'Portfolio of Praveen, B.Tech AI & Data Science student at KIT Coimbatore: AI, computer vision, full-stack and AWS cloud projects.'),
    ('published', 'B.Tech AI & Data Science · KIT, Coimbatore', 'Hi, I''m Praveen.', 'Building Intelligent Experiences with AI, Software & Cloud.', 'AI, Software & Cloud', 'AI & Data Science undergraduate building accessible AI products, real-time full-stack systems and cloud infrastructure — with internship experience in artificial intelligence and DevOps on AWS.', '{"about":{"visible":true,"eyebrow":"About","title":"Engineering intelligent software, end to end.","description":""},"experience":{"visible":true,"eyebrow":"Journey","title":"Experience & education","description":"Internships and academics that shaped how I build."},"skills":{"visible":true,"eyebrow":"Toolkit","title":"Technical skills","description":"Languages, frameworks and platforms I work with, grouped by discipline."},"projects":{"visible":true,"eyebrow":"Selected work","title":"Featured projects","description":"Products I''ve designed and built across AI, computer vision and full-stack development."},"certificates":{"visible":true,"eyebrow":"Credentials","title":"Certifications & courses","description":"Formal coursework that complements my hands-on projects."},"achievements":{"visible":true,"eyebrow":"Recognition","title":"Achievements","description":"Grants, hackathons and milestones along the way."},"coding":{"visible":true,"eyebrow":"Problem solving","title":"Competitive programming","description":"Consistent practice in data structures and algorithms."},"contact":{"visible":true,"eyebrow":"Contact","title":"Let''s build something together.","description":"Open to internships, collaborations and conversations about AI, software and cloud. I''ll get back to you as soon as I can."}}'::jsonb, 'cobalt', 'full', true, 'Solved 530+ DSA problems across competitive programming platforms.', 'Designed and built with Next.js, Three.js and Supabase.', 'Praveen — AI Developer & Full-Stack Engineer', 'Portfolio of Praveen, B.Tech AI & Data Science student at KIT Coimbatore: AI, computer vision, full-stack and AWS cloud projects.')
on conflict (variant) do nothing;
update public.site_settings set published_at = now()
  where variant = 'published' and published_at is null;

-- experiences
do $seed$
begin
  if not exists (select 1 from public.experiences) then
insert into public.experiences (role, organization, location, employment_type, start_date, end_date, is_current, summary, highlights, technologies, is_published, sort_order)
values
    ('DevOps with AWS Intern', 'Finest Coder / Codingmart Technologies', 'Coimbatore', 'Internship · On-site', '2026-05', '2026-06', false, null, array['Worked hands-on with AWS EC2, VPC, S3, IAM and Linux for cloud infrastructure setup.', 'Configured EC2 instances, VPC networking, security groups and S3 storage.', 'Practiced cloud deployment, automation and basic DevOps workflows.']::text[], array['AWS EC2', 'AWS VPC', 'AWS S3', 'AWS IAM', 'Linux']::text[], true, 0),
    ('Artificial Intelligence Intern', 'NoviTech R&D Private Limited', null, 'Internship', '2025-04', '2025-05', false, null, array['Completed a one-month AI internship, gaining practical exposure to Artificial Intelligence concepts and applications.', 'Worked on AI-based problem solving and practical implementation during the internship.', 'Developed an understanding of applying AI concepts to real-world technical problems.']::text[], array['Artificial Intelligence']::text[], true, 1);
  end if;
end;
$seed$;

-- education
do $seed$
begin
  if not exists (select 1 from public.education) then
insert into public.education (degree, field, institution, location, start_date, end_date, grade, grade_label, coursework, description, is_published, sort_order)
values
    ('B.Tech', 'Artificial Intelligence and Data Science', 'KIT – Kalaignarkarunanidhi Institute of Technology', 'Coimbatore, Tamil Nadu, India', '2024', '2028', '8.1/10.0', 'CGPA', array['Data Structures & Algorithms', 'Object-Oriented Programming', 'Database Management Systems', 'Operating Systems', 'Computer Networks', 'Full Stack Development', 'Machine Learning', 'Artificial Intelligence']::text[], null, true, 0);
  end if;
end;
$seed$;

-- projects
do $seed$
begin
  if not exists (select 1 from public.projects) then
insert into public.projects (slug, title, summary, description, problem, solution, features, tech_stack, category, cover_path, screenshot_paths, repo_url, demo_url, video_url, start_date, end_date, is_featured, is_published, sort_order)
values
    ('sign-aura', 'Sign Aura', 'AI-powered multimodal sign language communication platform that converts video content into sign-language output for better accessibility.', 'Sign Aura is an AI-powered multimodal platform, currently being built, that converts video content into sign-language output for better accessibility. It integrates speech-to-text, text processing and sign generation, together with an interactive chatbot that keeps chat history.

The project was selected for Vidhya Incubation and received a ₹10,000 cash grant.', null, null, array['Video content to sign-language output', 'Speech-to-text transcription', 'Text processing and sign generation', 'Interactive chatbot with chat history']::text[], array['AI', 'NLP', 'Computer Vision', 'Speech-to-Text']::text[], 'AI · Accessibility', null, '{}'::text[], null, null, null, '2026-05', null, true, true, 0),
    ('airport-shuttle-monitoring-system', 'Airport Shuttle Monitoring System', 'Real-time system to monitor flights, gates and airport shuttle services, with an AI chatbot that gives passengers instant updates.', 'A real-time monitoring system for flights, gates and airport shuttle services. An integrated AI chatbot provides passengers with instant flight and shuttle updates, while n8n automates the underlying workflows and notifications.', null, null, array['Real-time monitoring of flights, gates and shuttle services', 'AI chatbot for instant flight and shuttle updates', 'Automated workflows and notifications with n8n']::text[], array['MongoDB', 'Express.js', 'React', 'Node.js', 'n8n', 'AI Chatbot']::text[], 'Full-Stack · Automation', null, '{}'::text[], null, null, null, '2025-07', null, false, true, 1),
    ('real-time-object-face-detection', 'Real-Time Object & Face Detection System', 'Computer-vision system for real-time object and face detection and tracking from live camera input.', 'A computer-vision system built with Python and OpenCV that processes live video from a camera, detects objects and faces in real time, and tracks them using image-processing techniques.', null, null, array['Live video processing from camera input', 'Real-time object detection', 'Face detection and tracking', 'Image-processing techniques to identify and track detections']::text[], array['Python', 'OpenCV']::text[], 'Computer Vision', null, '{}'::text[], null, null, null, '2025-04', null, false, true, 2);
  end if;
end;
$seed$;

-- certificates
do $seed$
begin
  if not exists (select 1 from public.certificates) then
insert into public.certificates (title, issuer, issue_date, expiry_date, credential_id, credential_url, image_path, pdf_path, category, description, is_published, sort_order)
values
    ('Programming in Java', 'NPTEL', '2026', null, null, null, null, null, 'Programming', null, true, 0),
    ('Artificial Intelligence Essentials', 'Coursera', '2025', null, null, null, null, null, 'AI & ML', null, true, 1),
    ('Cloud Computing', 'IBM · Coursera', '2025', null, null, null, null, null, 'Cloud', null, true, 2),
    ('Python Programming Fundamentals', 'Microsoft · Coursera', '2025', null, null, null, null, null, 'Programming', null, true, 3),
    ('Machine Learning', 'NoviTech', '2024', null, null, null, null, null, 'AI & ML', null, true, 4);
  end if;
end;
$seed$;

-- achievements
do $seed$
begin
  if not exists (select 1 from public.achievements) then
insert into public.achievements (achieved_on, link_url, image_path, is_published, title, organization, highlight, description, category, sort_order)
values
    (null, null, null, true, 'Vidhya Incubation — Project Grant', 'Vidhya Incubation', '₹10,000 grant', 'Received a ₹10,000 project grant for developing Sign Aura, an AI-powered multimodal sign language communication platform focused on accessible video-to-sign communication.', 'Grant', 0),
    (null, null, null, true, 'CodeXtreme 24-Hour Hackathon', 'KIT', 'Rank 6', 'Secured Rank 6 in a 24-hour coding hackathon at KIT, demonstrating strong problem-solving and competitive programming skills.', 'Hackathon', 1),
    (null, null, null, true, 'Smart India Hackathon (SIH)', 'Smart India Hackathon', 'College internal selection', 'Selected at the college internal level of Smart India Hackathon, contributing to problem analysis, solution development and presenting the proposed solution.', 'Hackathon', 2),
    (null, null, null, true, '36-Hour Team Hackathon', null, 'Participant', 'Participated in a 36-hour team hackathon focused on rapid problem solving, idea development and building practical solutions.', 'Hackathon', 3),
    ('2025', null, null, true, 'Salesforce Trailhead — Agentblazer Innovator 2025', 'Salesforce Trailhead', '66 badges · 4 Superbadges', 'Earned the Agentblazer Innovator 2025 badge and completed 66 Trailhead badges, including 4 Superbadges, through hands-on learning in the Salesforce ecosystem.', 'Recognition', 4);
  end if;
end;
$seed$;

-- coding_profiles
do $seed$
begin
  if not exists (select 1 from public.coding_profiles) then
insert into public.coding_profiles (platform, username, profile_url, problems_solved, max_rating, note, is_published, sort_order)
values
    ('LeetCode', null, null, 92, 1421, null, true, 0),
    ('CodeChef', null, null, 439, 1404, null, true, 1);
  end if;
end;
$seed$;

-- skills
do $seed$
begin
  if not exists (select 1 from public.skills) then
insert into public.skills (name, category, is_published, sort_order)
values
    ('Java', 'Programming Languages', true, 0),
    ('Python', 'Programming Languages', true, 1),
    ('C', 'Programming Languages', true, 2),
    ('C++', 'Programming Languages', true, 3),
    ('JavaScript', 'Programming Languages', true, 4),
    ('TypeScript', 'Programming Languages', true, 5),
    ('HTML', 'Frontend', true, 6),
    ('CSS', 'Frontend', true, 7),
    ('React.js', 'Frontend', true, 8),
    ('Next.js', 'Frontend', true, 9),
    ('Node.js', 'Backend', true, 10),
    ('Express.js', 'Backend', true, 11),
    ('MySQL', 'Databases', true, 12),
    ('MongoDB', 'Databases', true, 13),
    ('AWS EC2', 'Cloud & DevOps', true, 14),
    ('AWS VPC', 'Cloud & DevOps', true, 15),
    ('AWS S3', 'Cloud & DevOps', true, 16),
    ('AWS IAM', 'Cloud & DevOps', true, 17),
    ('Linux', 'Cloud & DevOps', true, 18),
    ('Machine Learning', 'AI & Machine Learning', true, 19),
    ('Computer Vision', 'AI & Machine Learning', true, 20),
    ('NLP', 'AI & Machine Learning', true, 21),
    ('Git', 'Developer Tools', true, 22),
    ('GitHub', 'Developer Tools', true, 23),
    ('n8n', 'Developer Tools', true, 24),
    ('Data Structures & Algorithms', 'Core Computer Science', true, 25),
    ('Object-Oriented Programming', 'Core Computer Science', true, 26);
  end if;
end;
$seed$;
