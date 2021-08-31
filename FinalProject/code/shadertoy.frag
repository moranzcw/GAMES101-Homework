// A monster scene - by moranzcw - 2021
// Email: moranzcw@gmail.com
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.


const float EPSILON = 0.0001;
const float PI = 3.141592653;

const int MAX_MARCHING_STEPS = 256;
const float MIN_T = 0.0;
const float MAX_T = 50.0;

const float K = 24.0; // for distance dunction soft shadows

// oldschool rand() from Visual Studio
int   seed = 1;
void  srand(int s ) { seed = s; }
int   rand(void)  { seed=seed*0x343fd+0x269ec3; return (seed>>16)&32767; }
float frand(void) { return float(rand())/32767.0; }

// hash by Hugo Elias
int hash( int n ) { n=(n<<13)^n; return n*(n*n*15731+789221)+1376312589; }

// ambient
float ambient = 0.4;

// dot light
vec3 DOT_LIGHT_POS = vec3(0.0, 6.0, 0.0); // position
vec3 DOT_LIGHT_INT = 2.0 * vec3(1.0, 1.0, 0.9); // intensity

// direction light
vec3 DIR_LIGHT_DIR = normalize(vec3(0.15, 1.0, -0.45)); // direction
vec3 DIR_LIGHT_IRR = 3.5 * vec3(1.0, 1.0, 0.9); // irradiance


/* -------------------------------------

  SDF

------------------------------------- */

// SDF boolean
float intersectSDF(float distA, float distB) {
    return max(distA, distB);
}

float unionSDF(float distA, float distB) {
    return min(distA, distB);
}

float differenceSDF(float distA, float distB) {
    return max(distA, -distB);
}

//SDF functions by iq.
//see https://iquilezles.org/www/articles/distfunctions/distfunctions.htm
float dot2( in vec2 v ) { return dot(v,v); }
float dot2( in vec3 v ) { return dot(v,v); }

float quadSDF( vec3 p, vec3 a, vec3 b, vec3 c, vec3 d )
{
  vec3 ba = b - a; vec3 pa = p - a;
  vec3 cb = c - b; vec3 pb = p - b;
  vec3 dc = d - c; vec3 pc = p - c;
  vec3 ad = a - d; vec3 pd = p - d;
  vec3 nor = cross( ba, ad );

  return sqrt(
    (sign(dot(cross(ba,nor),pa)) +
     sign(dot(cross(cb,nor),pb)) +
     sign(dot(cross(dc,nor),pc)) +
     sign(dot(cross(ad,nor),pd))<3.0)
     ?
     min( min( min(
     dot2(ba*clamp(dot(ba,pa)/dot2(ba),0.0,1.0)-pa),
     dot2(cb*clamp(dot(cb,pb)/dot2(cb),0.0,1.0)-pb) ),
     dot2(dc*clamp(dot(dc,pc)/dot2(dc),0.0,1.0)-pc) ),
     dot2(ad*clamp(dot(ad,pd)/dot2(ad),0.0,1.0)-pd) )
     :
     dot(nor,pa)*dot(nor,pa)/dot2(nor) );
}

float boxSDF( vec3 p, vec3 b )
{
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float cylinderSDF_X( vec3 p, float h, float r )
{
    vec2 d = abs(vec2(length(p.zy),p.x)) - vec2(r,h);
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float cylinderSDF_Y( vec3 p, float h, float r )
{
    vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(r,h);
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float cylinderSDF_Z( vec3 p, float h, float r )
{
    vec2 d = abs(vec2(length(p.yx),p.z)) - vec2(r,h);
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}


// scene
float columns1(vec3 p)
{
    p = vec3(mod(p.x, 3.0)-1.5, p.y-1.0, mod(p.z, 3.0)-1.5);
    float d = cylinderSDF_Y(p, 1.0, 0.25);
    p += vec3(0.0, -1.0, 0.0);
    d = unionSDF(d, boxSDF(p, vec3(0.3, 0.05, 0.3)));
    return d;
}

float columns2(vec3 p)
{
    p = vec3(mod(p.x, 3.0)-1.5, p.y-4.0, mod(p.z, 3.0)-1.5);
    float d = boxSDF(p, vec3(0.22, 0.15, 0.22));
    p += vec3(0.0, -0.75, 0.0);
    d = unionSDF(d, boxSDF(p, vec3(0.17, 0.75, 0.17)));
    p += vec3(0.0, -0.75, 0.0);
    d = unionSDF(d, boxSDF(p, vec3(0.3, 0.05, 0.3)));
    return d;
}

float columns3(vec3 p)
{
    vec3 tp = vec3(mod(p.x+1.5, 3.0)-1.5, p.y-4.0, mod(p.z, 3.0)-1.5);
    float d = boxSDF(tp, vec3(0.22, 0.15, 0.22));
    tp += vec3(0.0, -0.75, 0.0);
    d = unionSDF(d, cylinderSDF_Y(tp, 0.75, 0.17));
    tp += vec3(0.0, -0.75, 0.0);
    d = unionSDF(d, boxSDF(tp, vec3(0.3, 0.05, 0.3)));
    
    d = differenceSDF(d, boxSDF(p + vec3(-9.0, -5.0, 0.0), vec3(2.0, 4.0, 5.0)));
    d = differenceSDF(d, boxSDF(p + vec3(9.0, -5.0, 0.0), vec3(2.0, 4.0, 5.0)));
    return d;
}

float roof1(vec3 p)
{
    //
    float box1 = boxSDF(p + vec3(0.0, -3.0, 0.0), vec3(100.0, 1.0, 20.0));
    float box2 = boxSDF(p + vec3(0.0, -3.0, 0.0), vec3(7.25, 1.5, 1.25));
    float roof = differenceSDF(box1, box2);
    
    //
    float box3 = boxSDF(p + vec3(0.0, -4.0, -3.0), vec3(10.25, 0.6, 1.25));
    float box4 = boxSDF(p + vec3(0.0, -4.0, 3.0), vec3(10.25, 0.6, 1.25));
    roof = differenceSDF(roof, unionSDF(box3, box4));
    
    //
    float box5 = boxSDF(p + vec3(9.0, -4.0, 0.0), vec3(1.25, 0.6, 2.0));
    float box6 = boxSDF(p + vec3(-9.0, -4.0, 0.0), vec3(1.25, 0.6, 2.0));
    roof = differenceSDF(roof, unionSDF(box5, box6));
    
    //
    p = vec3(mod(p.x-1.5, 3.0) - 1.5, p.y, p.z);
    float cylinderZ = cylinderSDF_Z(p + vec3(0.0, -2.0, 0.0), 100.0, 1.25);
    float cylinderX = cylinderSDF_X(p + vec3(0.0, -2.0, 0.0), 100.0, 1.25);
    return differenceSDF(roof, unionSDF(cylinderX, cylinderZ));
}

float roof2(vec3 p)
{
    //
    float box1 = boxSDF(p + vec3(0.0, -7.5, 0.0), vec3(100.0, 2.0, 20.0));
    float box2 = boxSDF(p + vec3(0.0, -7.5, 0.0), vec3(7.25, 2.5, 1.25));
    float roof = differenceSDF(box1, box2);
    
    //
    vec3 tp = vec3(mod(p.x-1.5, 3.0) - 1.5, p.y-5.5, mod(p.z-1.5, 3.0) - 1.5);
    float cylinderZ = cylinderSDF_Z(tp, 100.0, 1.4);
    float cylinderX = cylinderSDF_X(tp, 100.0, 1.25);
    roof =  differenceSDF(roof, unionSDF(cylinderX, cylinderZ));
    
    //
    float box3 = boxSDF(p + vec3(0.0, -7.5, 1.45), vec3(7.5, 2.0, 0.2));
    float box4 = boxSDF(p + vec3(0.0, -7.5, -1.45), vec3(7.5, 2.0, 0.2));
    float temp = unionSDF(box3, box4);
    
    //
    tp = vec3(mod(p.x-1.5, 1.5)-1.5, p.y-5.5, p.z);
    float cylinderZ1 = cylinderSDF_Z(tp + vec3(0.7, 0.0, 0.0), 100.0, 0.625);
    temp =  differenceSDF(temp, cylinderZ1);

    
    return unionSDF(roof, temp);
}

float wall(vec3 p)
{
    float box1 = boxSDF(p + vec3(0.0, 0.0, 4.35), vec3(100.0, 9.5, 0.1));
    float box2 = boxSDF(p + vec3(0.0, 0.0, -4.35), vec3(100.0, 9.5, 0.1));
    float box3 = boxSDF(p + vec3(10.35, 0.0, 0.0), vec3(0.1, 9.5, 100.0));
    float box4 = boxSDF(p + vec3(-10.35, 0.0, 0.0), vec3(0.1, 9.5, 100.0));
    return unionSDF(unionSDF(box1, box2), unionSDF(box3, box4));
}

float ground(vec3 p)
{
    return quadSDF(p,vec3(100.0,0.0,100.0), vec3(100.0,0.0,-100.0),
                     vec3(-100.0,0.0,-100.0), vec3(-100.0,0.0,100.0));
}

// scene
float sceneSDF(vec3 p)
{
    float scene = MAX_T;
    scene = unionSDF(scene, ground(p));
    scene = unionSDF(scene, wall(p));
    scene = unionSDF(scene, columns1(p));
    scene = unionSDF(scene, roof1(p));
    scene = unionSDF(scene, columns2(p));
    scene = unionSDF(scene, columns3(p));
    scene = unionSDF(scene, roof2(p));
    
    return scene;
}

/* -------------------------------------

  Ray Marching

------------------------------------- */
float rayMarching(vec3 ro, vec3 rd, float start, float end) 
{
    float t = start;
    for (int i = 0; i < MAX_MARCHING_STEPS; i++) 
    {
        float dist = sceneSDF(ro + t * rd);
        if (dist < EPSILON * t) 
        {
			return t;
        }
        t += dist;
        if (t > end)
        {
            return t;
        }
    }
    return t;
}

/* -------------------------------------

  Visibility of the shading point to light source

------------------------------------- */
float visibility(vec3 ro, vec3 rd, float start, float end)
{
    float t = start;
    vec3 p;
    float dist;
    float tempVisibility;
    float visibility = 1.0;
        
    for (int i = 0; i < MAX_MARCHING_STEPS; i++) 
    {
        p = ro + t * rd;
        dist = sceneSDF(p);
        
        tempVisibility = K * dist / t;
        visibility = min(tempVisibility, visibility);
        
        if (dist < EPSILON) 
        {
			return 0.0;
        }
        t += dist * (0.7 + frand() * 0.3); // dither
        if (t >= end) 
        {
            break;
        }
    }
    return visibility;
}


/* -------------------------------------

  Shading

------------------------------------- */
// normal
vec3 surfaceNormal(vec3 p) 
{
    return normalize(vec3(
        sceneSDF(vec3(p.x + EPSILON, p.y, p.z)) - sceneSDF(vec3(p.x - EPSILON, p.y, p.z)),
        sceneSDF(vec3(p.x, p.y + EPSILON, p.z)) - sceneSDF(vec3(p.x, p.y - EPSILON, p.z)),
        sceneSDF(vec3(p.x, p.y, p.z  + EPSILON)) - sceneSDF(vec3(p.x, p.y, p.z - EPSILON))
    ));
}

// ambient occlusion
float fakeAO(vec3 p, vec3 n)
{
    float ao = 0.0;
    float weight = 10.0;
    for(int i=0; i<8; i++)
    {
        float spacing = 0.01 + 0.02 * float(i*i);
        vec3 sp = p + n * spacing;
        float d = sceneSDF(sp);
        ao += weight * (spacing - d);
        weight *= 0.5;
    }
    return 1.0 - clamp(ao, 0.0, 1.0);
}

vec3 lambert(vec3 diffuseColor, vec3 p, vec3 n, vec3 l, vec3 irradiance)
{
    float dotLN = clamp(dot(l, n), 0.0, 1.0);
    return irradiance * dotLN * diffuseColor;
}

// shade
vec3 shade(vec3 p)
{
    vec3 n = surfaceNormal(p);
    vec3 tn = abs(n); 
    vec3 tex = texture(iChannel0, p.zy).rgb * tn.x 
                + texture(iChannel0, p.xz).rgb * tn.y
                + texture(iChannel0, p.xy).rgb * tn.z;

    // ambient occlusion
    vec3 color = (0.2 + 0.8 * fakeAO(p, n)) * ambient * tex;
    
    // dot light
    vec3 tempDotLightDir = DOT_LIGHT_POS - p;
    vec3 direction = normalize(tempDotLightDir);
    float dist = length(tempDotLightDir);
    vec3 irradiance = DOT_LIGHT_INT / dist;  // Linear attenuation may be better
    
    float v = visibility(p, direction, 10.0*EPSILON, dist);
    color += v * lambert(tex, p, n, direction, irradiance);
    
    // direction light
    v = visibility(p, DIR_LIGHT_DIR, 10.0*EPSILON, MAX_T);
    color += v * lambert(tex, p, n, DIR_LIGHT_DIR, DIR_LIGHT_IRR);
    
    // fog
    //color = mix(color, 0.5 * vec3(0.8, 0.77, 0.75), 1.0 - exp2(-0.25 * dist));
    return color;
}


/* -------------------------------------

  Camera

------------------------------------- */
vec3 rayDirection(float fieldOfView, vec2 size, vec2 fragCoord)
{
    vec2 xy = fragCoord - size / 2.0;
    float z = size.y / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3(xy, -z));
}

mat3 viewMatrix(vec3 cameraOrigin, vec3 center, vec3 up)
{
    vec3 f = normalize(center - cameraOrigin);
    vec3 s = normalize(cross(f, up));
    vec3 u = cross(s, f);
    return mat3(s, u, -f);
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    //
    DOT_LIGHT_POS = vec3(4.0 + 2.0*sin(0.5*iTime), 6.0, 0.0);
    
    // init random seed
    ivec2 q = ivec2(fragCoord);
    srand( hash(q.x+hash(q.y+hash(1117*iFrame))));
    
    // camera ray
	vec3 cameraRayDirInView = rayDirection(110.0, iResolution.xy, fragCoord);
    
    vec3 cameraPos = vec3(9.3, 5.0, - 2.5 * sin(0.2 * iTime));
    mat3 viewToWorld = viewMatrix(cameraPos, vec3(0.0, 5.0, 0.0), vec3(0.0, 1.0, 0.0));
    
    vec3 cameraRayDir = viewToWorld * cameraRayDirInView;
    
    // distance
    float dist = rayMarching(cameraPos, cameraRayDir, MIN_T, MAX_T);
    
    // didn't hit
    if (dist > MAX_T) 
    {
        fragColor = vec4(.58, 0.77, 0.95, 0.0);
		return;
    }
    
    // hit point
    vec3 p = cameraPos + dist * cameraRayDir;
    
    // shading
    vec3 color = shade(p);
    
    fragColor = vec4(pow(color,vec3(1.0/2.2)), 1.0);
}