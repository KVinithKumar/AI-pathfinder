
// src/ai/flows/analyze-student-profile.ts
'use server';

/**
 * @fileOverview Analyzes a student's profile (resume, academic details, and interests) to suggest suitable career paths.
 *
 * - analyzeStudentProfile - A function that analyzes the student profile and suggests career paths.
 * - AnalyzeStudentProfileInput - The input type for the analyzeStudentProfile function.
 * - AnalyzeStudentProfileOutput - The output type for the analyzeStudentProfile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeStudentProfileInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "The student's resume as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  academicDetails: z
    .object({
      tenthPercentage: z.number().describe('10th grade percentage'),
      twelfthPercentage: z.number().optional().describe('12th grade percentage'),
      diplomaUgPercentage: z
        .number()
        .optional()
        .describe('Diploma or Undergraduate percentage, if applicable'),
    })
    .describe('The academic details of the student.'),
  interests: z
    .array(z.string())
    .describe('A list of the student’s interests (e.g., AI, Web Dev, Design, Data Science).'),
});

export type AnalyzeStudentProfileInput = z.infer<typeof AnalyzeStudentProfileInputSchema>;

const AnalyzeStudentProfileOutputSchema = z.object({
  suggestedCareerPaths: z.any().describe('Flexible output for suggested career paths.'),
});

export type AnalyzeStudentProfileOutput = {
  suggestedCareerPaths: any;
  resumeInsights?: { pros?: string[]; cons?: string[] };
};

export async function analyzeStudentProfile(
  input: AnalyzeStudentProfileInput
): Promise<AnalyzeStudentProfileOutput> {
  return analyzeStudentProfileFlow(input);
}

const analyzeProfilePrompt = ai.definePrompt({
  name: 'analyzeProfilePrompt',
  input: {schema: AnalyzeStudentProfileInputSchema},
  // Removed output schema to allow free-form output
  prompt: `You are a career guidance expert. Analyze the student's profile, resume, and interests to suggest suitable career paths.

Consider the student's academic details:
10th Percentage: {{{academicDetails.tenthPercentage}}}
12th Percentage: {{{academicDetails.twelfthPercentage}}}
Diploma/UG Percentage: {{{academicDetails.diplomaUgPercentage}}}

Student's Interests: {{#each interests}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Resume content: {{media url=resumeDataUri}}

Based on this information, generate career paths as follows:
- For EACH selected interest domain, provide AT LEAST 2 distinct, relevant career paths.
- De-duplicate across interests; overall include 4-12 total paths if many interests overlap.
- For each career path, include a tags array listing the matching interests (e.g., ["Artificial Intelligence"]).

For each career path:
1. Identify the core required skills (as a string array under the key "requiredSkills").
2. Provide a skill gap report including the student's current level (Beginner, Intermediate, Advanced) for each relevant skill.
3. For each skill in the gap report, recommend specific courses to bridge the gap. Each course recommendation MUST include a 'title' and a 'link' (a direct URL). Prioritize courses from reputable platforms like Coursera or YouTube. Ensure the links are valid.

Return ONLY valid JSON with EXACTLY the following structure:
{
  "resumeInsights": {
    "pros": ["<string>"],
    "cons": ["<string>"]
  },
  "suggestedCareerPaths": [
    {
      "careerPath": "<string>",
      "requiredSkills": ["<string>", "<string>", "<string>"],
      "missingSkills": ["<string>"],
      "weakSkills": ["<string>"],
      "projectSuggestions": [
        { "title": "<string>", "description": "<string>", "link": "https://..." }
      ],
      "roadmap": [
        { "title": "<string>", "steps": ["<string>", "<string>"] }
      ],
      "tags": ["<interestLabel>", "<interestLabel>"] ,
      "skillGapReport": [
        {
          "skill": "<string>",
          "yourLevel": "Beginner" | "Intermediate" | "Advanced",
          "recommendedCourses": [
            { "title": "<string>", "link": "https://..." }
          ]
        }
      ]
    }
  ]
}
No extra text, only JSON.`
});

const analyzeStudentProfileFlow = ai.defineFlow(
  {
    name: 'analyzeStudentProfileFlow',
    inputSchema: AnalyzeStudentProfileInputSchema,
    // Removed outputSchema to allow free-form output
  },
  async (input: AnalyzeStudentProfileInput) => {
    // Helper to normalize any output shape into an array of paths
    function normalize(out: unknown): any[] {
      let data: any = out;
      try {
        if (typeof data === 'string') data = JSON.parse(data);
      } catch (_) {}

      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as any).suggestedCareerPaths)) return (data as any).suggestedCareerPaths;
      if (data && Array.isArray((data as any).careerPaths)) return (data as any).careerPaths;
      if (data && typeof data === 'object') {
        const arrays: any[] = [];
        for (const key of Object.keys(data)) {
          const val = (data as any)[key];
          if (Array.isArray(val)) arrays.push(...val);
        }
        if (arrays.length > 0) return arrays;
      }
      return [];
    }

    // Local fallback suggestions if AI call fails (or returns empty)
    function fallbackSuggestions(interests: string[]) {
      const catalog: Record<string, { careerPath: string; requiredSkills: string[] }[]> = {
        'Artificial Intelligence': [
          { careerPath: 'Machine Learning Engineer', requiredSkills: ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'Data Structures', 'Statistics'] },
          { careerPath: 'AI Researcher', requiredSkills: ['Python', 'Deep Learning', 'NLP', 'Research Methods', 'Mathematics'] },
        ],
        'Web Development': [
          { careerPath: 'Frontend Developer', requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript'] },
          { careerPath: 'Full-Stack Developer', requiredSkills: ['Node.js', 'Express', 'React', 'Databases', 'REST APIs'] },
        ],
        'UI/UX Design': [
          { careerPath: 'UI/UX Designer', requiredSkills: ['Figma', 'Wireframing', 'Prototyping', 'Design Systems', 'User Research'] },
          { careerPath: 'Product Designer', requiredSkills: ['Interaction Design', 'Visual Design', 'Usability Testing', 'Figma'] },
        ],
        'Data Science': [
          { careerPath: 'Data Scientist', requiredSkills: ['Python', 'Pandas', 'Machine Learning', 'Statistics', 'SQL'] },
          { careerPath: 'Data Analyst', requiredSkills: ['SQL', 'Excel', 'Tableau/PowerBI', 'Python', 'Data Cleaning'] },
        ],
        'Cybersecurity': [
          { careerPath: 'Security Analyst', requiredSkills: ['Network Security', 'SIEM', 'Incident Response', 'Linux', 'Scripting'] },
          { careerPath: 'Penetration Tester', requiredSkills: ['Linux', 'Networking', 'Burp Suite', 'OWASP', 'Scripting'] },
        ],
        'Mobile App Development': [
          { careerPath: 'Android Developer', requiredSkills: ['Kotlin', 'Android SDK', 'Jetpack', 'REST APIs'] },
          { careerPath: 'Flutter Developer', requiredSkills: ['Dart', 'Flutter', 'State Management', 'REST APIs'] },
        ],
        'Cloud Computing': [
          { careerPath: 'Cloud Engineer', requiredSkills: ['AWS/Azure/GCP', 'Linux', 'Terraform', 'Networking', 'Containers'] },
          { careerPath: 'DevOps Engineer', requiredSkills: ['CI/CD', 'Docker', 'Kubernetes', 'Monitoring', 'Scripting'] },
        ],
        'Game Development': [
          { careerPath: 'Game Developer', requiredSkills: ['Unity/Unreal', 'C# or C++', 'Game Physics', '3D Math'] },
          { careerPath: 'Technical Artist', requiredSkills: ['Shaders', '3D Pipelines', 'Scripting', 'Rendering'] },
        ],
      };

      const seen = new Set<string>();
      const paths: any[] = [];
      for (const interest of interests) {
        const items = catalog[interest] || [];
        for (const item of items) {
          if (seen.has(item.careerPath)) continue;
          seen.add(item.careerPath);
          const gap = item.requiredSkills.slice(0, Math.min(3, item.requiredSkills.length)).map((s) => ({
            skill: s,
            yourLevel: 'Beginner',
            recommendedCourses: [
              { title: `${s} Crash Course (YouTube)`, link: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(s + ' tutorial') },
              { title: `${s} Specialization (Coursera)`, link: 'https://www.coursera.org/search?query=' + encodeURIComponent(s) },
            ],
          }));
          paths.push({
            careerPath: item.careerPath,
            requiredSkills: item.requiredSkills,
            missingSkills: item.requiredSkills,
            weakSkills: gap.map((g) => g.skill),
            projectSuggestions: [
              { title: `${item.careerPath} Portfolio Project`, description: 'Build and deploy a production-ready project demonstrating core skills.', link: 'https://roadmap.sh' },
            ],
            roadmap: [
              { title: 'Foundations', steps: ['Learn fundamentals', 'Build mini-projects'] },
              { title: 'Intermediate', steps: ['Take a specialization', 'Build a capstone'] },
              { title: 'Advanced', steps: ['Contribute to open source', 'Apply for internships'] },
            ],
            tags: [interest],
            skillGapReport: gap,
          });
        }
      }
      return paths.length ? paths : [
        { careerPath: 'Generalist Software Engineer', requiredSkills: ['Problem Solving', 'Git', 'JavaScript/TypeScript'], missingSkills: ['Testing'], weakSkills: ['System Design'], projectSuggestions: [], roadmap: [], tags: [], skillGapReport: [] },
      ];
    }

    try {
      const { output } = await analyzeProfilePrompt(input);
      const normalized = normalize(output);
      if (!normalized.length) {
        return { suggestedCareerPaths: fallbackSuggestions(input.interests), resumeInsights: { pros: ['Basic profile analyzed'], cons: ['AI output empty; used fallback'] } };
      }
      return { suggestedCareerPaths: normalized };
    } catch (err) {
      console.error('AI call failed, using fallback:', err);
      return {
        suggestedCareerPaths: fallbackSuggestions(input.interests),
        resumeInsights: {
          pros: ['Generated locally using interest-based defaults'],
          cons: ['Live AI service unavailable; results may be generic'],
        },
      };
    }
  }
);

