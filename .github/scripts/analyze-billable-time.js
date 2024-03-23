const { Octokit } = require("@octokit/rest");
const { table } = require("console");

const GITHUB_TOKEN = process.env.GITPAT;
const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function getPrivateRepos() {
  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    visibility: "private",
  });

  const actionsRepos = repos.filter((repo) => repo.has_workflows);

  const billableTimes = await Promise.all(
    actionsRepos.map(async (repo) => {
      const { data: usage } = await octokit.request(
        "GET /repos/{owner}/{repo}/actions/usage",
        {
          owner: repo.owner.login,
          repo: repo.name,
        }
      );

      return {
        name: repo.name,
        billable_ms: usage.billable.total_ms,
      };
    })
  );

  table(billableTimes);
}

getPrivateRepos();
