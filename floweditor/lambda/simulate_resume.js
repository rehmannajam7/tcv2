const uuid = () => Math.random().toString(36).slice(2);

function findNode(def, uuid) {
  return (def.nodes || []).find(n => n.uuid === uuid);
}

function executeActions(def, run, node, events) {
  (node.actions || []).forEach(act => {
    if (act.type === 'send_msg') {
      events.push({
        type: 'msg_created',
        created_on: new Date().toISOString(),
        step_uuid: run.path[run.path.length - 1].uuid,
        msg: {
           uuid: uuid(),
           urn: (run.contact && run.contact.urns && run.contact.urns[0]) || 'tel:+123',
           text: act.text,
           quick_replies: act.quick_replies || [],
           attachments: act.attachments || []
         }
      });
    }
    if (act.type === 'set_run_result') {
      run.results = run.results || {};
      run.results[act.name] = { value: act.value, category: act.category || act.value, input: act.value, created_on: new Date().toISOString(), node_uuid: node.uuid };
    }
  });
}

function pickExit(run, node, msg) {
  if (!node.router) return (node.exits || [])[0];
  if (node.router.wait && node.router.wait.type === 'msg') {
    const cat = (node.router.categories || []).find(c => c.name.toLowerCase() === (msg ? msg.text : '').toLowerCase());
    return (node.exits || []).find(e => e.uuid === (cat ? cat.exit_uuid : null)) || (node.exits || [])[0];
  }
  return (node.exits || [])[0];
}

function runFlow(def, contact, resumeMsg) {
  const session = { uuid: uuid(), status: 'active', contact, runs: [] };
  const run = {
    uuid: uuid(),
    flow_uuid: def.uuid,
    status: 'active',
    path: [],
    results: {}
  };
  session.runs.push(run);

  // If we have a prior session, restore path and results
  if (resumeMsg && resumeMsg.session) {
    const prev = resumeMsg.session.runs[resumeMsg.session.runs.length - 1];
    run.path = prev.path.map(s => ({ ...s }));
    run.results = { ...prev.results };
  }

  let current = run.path.length
    ? findNode(def, run.path[run.path.length - 1].node_uuid)
    : def.nodes[0];

  const events = [];

  while (current) {
    const step = { uuid: uuid(), node_uuid: current.uuid, arrived_on: new Date().toISOString(), exit_uuid: null };
    run.path.push(step);

    executeActions(def, run, current, events);

    const exit = pickExit(run, current, resumeMsg ? resumeMsg.msg : null);
    step.exit_uuid = exit ? exit.uuid : null;

    if (!exit || !exit.destination_uuid) {
      session.status = 'completed';
      run.status = 'completed';
      break;
    }
    current = findNode(def, exit.destination_uuid);
  }

  return { session, events };
}

exports.handler = async (event, context, callback) => {
  try {
    let payload = {};
    try {
      if (event && typeof event.body === 'string') payload = JSON.parse(event.body);
      else if (event && typeof event.body === 'object') payload = event.body || {};
    } catch (e) {}

    const { flow, session, resume } = payload;
    if (!flow) throw new Error('Missing flow');

    const { session: newSession, events } = runFlow(flow, session ? session.contact : resume.contact, resume);

    callback(null, {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ session: newSession, events })
    });
  } catch (err) {
    callback(null, {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    });
  }
};
