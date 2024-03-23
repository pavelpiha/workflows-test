const { Octokit } = require('@octokit/rest');

const ORG_NAME = process.env.ORG_NAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: GITHUB_TOKEN });

const formatDate = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getLastMonthDateRange = () => {
  const endDate = new Date();
  endDate.setDate(1);
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setMonth(endDate.getMonth() - 1);

  return { start: formatDate(startDate), end: formatDate(endDate) };
};
async function fetchAllRepositories() {
  await octokit.rest.repos
    .listForOrg({
      org: ORG_NAME,
      type: 'private',
    })
    .then(({ data }) => {
      // handle data
      console.log('data', data);
    });
}

async function getRepositories() {
  await octokit
    .request(`GET /orgs/${ORG_NAME}/repos`, {
      org: ORG_NAME,
      type: 'private',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    .then(({ data }) => {
      console.log('data1', data);
    });
}
async function fetchRepositories(orgName) {
  let repos = [];
  for await (const response of octokit.paginate.iterator(octokit.rest.repos.listForOrg, {
    org: orgName,
    type: 'private',
    per_page: 1000,
  })) {
    repos = repos.concat(response.data.map((repo) => repo.name));
    console.log('repos', repos);
  }
  return repos;
}

async function calculateWorkflowRunMinutes(repoName, startDate, endDate) {
  let runMinutes = 0;

  for await (const response of octokit.paginate.iterator(octokit.rest.actions.listWorkflowRunsForRepo, {
    owner: ORG_NAME,
    repo: repoName,
    per_page: 100,
    created: `${startDate}..${endDate}`,
  })) {
    for (let run of response.data) {
      console.log('!!!!!!!!!!', run);
      const runDuration = new Date(run.updated_at) - new Date(run.created_at);
      runMinutes += runDuration / 60000; // Convert milliseconds to minutes
    }
  }

  return runMinutes;
}

async function analyzeWorkflows() {
  const { start, end } = getLastMonthDateRange();
  const repos = await fetchRepositories(ORG_NAME);
  let results = [];

  for (let repo of repos) {
    const totalMinutes = await calculateWorkflowRunMinutes(repo, start, end);
    if (totalMinutes > 0) {
      results.push({ Repository: repo, TotalRunMinutesLastMonth: totalMinutes.toFixed(2) });
    }
  }

  console.table(results);
}

analyzeWorkflows().catch(console.error);
fetchAllRepositories().catch(console.error);
getRepositories().catch(console.error);
