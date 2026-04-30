// reconciler在不同时机中的hooks集合实现
// reconciler和react是解耦的，不希望reconciler直接调用react,所以需要一个中转站shared
import * as React from 'react';

const internals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
export default internals;
