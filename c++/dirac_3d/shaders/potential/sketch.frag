#if (__VERSION__ >= 330) || (defined(GL_ES) && __VERSION__ >= 300)
#define texture2D texture
#else
#define texture texture2D
#endif

#if (__VERSION__ > 120) || defined(GL_ES)
precision highp float;
#endif
 
#if __VERSION__ <= 120
varying vec2 UV;
#define fragColor gl_FragColor
#else
in vec2 UV;
out vec4 fragColor;
#endif

uniform sampler2D tex;

uniform ivec3 texelDimensions3D;
uniform ivec2 texelDimensions2D;
uniform vec3 dimensions3D;

uniform vec3 offsetTexCoord;
uniform vec3 sigmaTexCoord;
uniform vec4 amplitude;
uniform float maxScalarValue;
uniform float maxVectorMag;

vec2 to2DTextureCoordinates(vec3 uvw) {
    int width2D = texelDimensions2D[0];
    int height2D = texelDimensions2D[1];
    int width3D = texelDimensions3D[0];
    int height3D = texelDimensions3D[1];
    int length3D = texelDimensions3D[2];
    float wStack = float(width2D)/float(width3D);
    // float hStack = float(height2D)/float(height3D);
    float xIndex = float(width3D)*mod(uvw[0], 1.0);
    float yIndex = float(height3D)*mod(uvw[1], 1.0);
    float zIndex = mod(floor(float(length3D)*uvw[2]), float(length3D));
    float uIndex = mod(zIndex, wStack)*float(width3D) + xIndex; 
    float vIndex = floor(zIndex / wStack)*float(height3D) + yIndex; 
    return vec2(uIndex/float(width2D), vIndex/float(height2D));
}

vec3 to3DTextureCoordinates(vec2 uv) {
    int width3D = texelDimensions3D[0];
    int height3D = texelDimensions3D[1];
    int length3D = texelDimensions3D[2];
    int width2D = texelDimensions2D[0];
    int height2D = texelDimensions2D[1];
    float wStack = float(width2D)/float(width3D);
    float hStack = float(height2D)/float(height3D);
    float u = mod(uv[0]*wStack, 1.0);
    float v = mod(uv[1]*hStack, 1.0);
    float w = (floor(uv[1]*hStack)*wStack
               + floor(uv[0]*wStack) + 0.5)/float(length3D);
    return vec3(u, v, w);
}

void main() {
    vec3 xyz = to3DTextureCoordinates(UV);
    float x = xyz.x;
    float y = xyz.y;
    float z = xyz.z;
    vec4 oldVal = texture2D(tex, UV);
    float x0 = offsetTexCoord.x;
    float y0 = offsetTexCoord.y;
    float z0 = offsetTexCoord.z;
    float sigmaX = sigmaTexCoord.x;
    float sigmaY = sigmaTexCoord.y;
    float sigmaZ = sigmaTexCoord.z;
    float gx = exp(-0.5*(x - x0)*(x - x0)/(sigmaX*sigmaX));
    float gy = exp(-0.5*(y - y0)*(y - y0)/(sigmaY*sigmaY));
    float gz = exp(-0.5*(z - z0)*(z - z0)/(sigmaZ*sigmaZ));
    vec4 newVal = oldVal + amplitude*gx*gy*gz;
    if (newVal[0] > maxScalarValue)
        newVal[0] = (oldVal[0] < maxScalarValue)? maxScalarValue: oldVal[0];
    if (newVal[0] < 0.0)
        newVal[0] = (oldVal[0] > 0.0)? 0.0: oldVal[0];
    // Limit the possible magnitude of the vector potential.
    vec3 threeVec = vec3(newVal[1], newVal[2], newVal[3]);
    if (dot(threeVec, threeVec) > maxVectorMag)
        threeVec = normalize(threeVec)*maxVectorMag;
    newVal[1] = threeVec.x;
    newVal[2] = threeVec.y;
    newVal[3] = threeVec.z;
    fragColor = newVal;

}